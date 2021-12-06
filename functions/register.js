import AWS from "aws-sdk";
// import validator from "@middy/validator";
// import middy from "@middy/core";
// import httpJsonBodyParser from "@middy/http-json-body-parser";
// import httpEventNormalizer from "@middy/http-event-normalizer";
// import httpErrorHandler from "@middy/http-error-handler";
// import cors from "@middy/http-cors";
import createError from "http-errors";
// import registerUserSchema from "../../lib/schemas/registerUserSchema";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "OPTIONS,GET,PUT,POST,DELETE",
};

async function registerUser(event, context) {
  console.log(process.env);
  console.log(event);
  const {
    email,
    password,
    confirmPassword,
    companyName,
    fullName,
    mobileNumber,
    isVerifiedMobileNumber,
    agreeTermsAndService,
  } = event.body;

  if (password !== confirmPassword) {
    throw new createError.InternalServerError(
      "Password and confirm password doesn't match"
    );
  }

  const signUpObj = {
    ClientId: process.env["CLIENT_ID"],
    /* required */
    Password: password,
    /* required */
    Username: email,
    /* required */
    ClientMetadata: {
      name: fullName,
      companyName: companyName,
      mobileNumber: mobileNumber,
      isVerifiedMobileNumber: isVerifiedMobileNumber,
      termsAndService: agreeTermsAndService,
    },
    UserAttributes: [{
      Name: "email",
      Value: email,
    }, ],
  };

  let response;
  try {
    const cognito = new AWS.CognitoIdentityServiceProvider();
    // coginit register

    response = await cognito.signUp(signUpObj).promise();
    //set the user into a particular group
    try {
      await cognito
        .adminAddUserToGroup({
          GroupName: process.env.COGNITO_POOL_GROUP_NAME,
          UserPoolId: process.env.POOL_ID,
          Username: email,
        })
        .promise();
    } catch (err) {
      console.log(err);
    }

    try {
      await cognito
        .adminConfirmSignUp({
          UserPoolId: process.env.POOL_ID,
          Username: email,
        })
        .promise();
    } catch (err) {
      console.log(err);
    }
  } catch (error) {
    console.log(error);
    let errMsg = "Something went wrong";
    let code = 500;
    if (error.code === "UsernameExistsException") {
      errMsg = "Email already exists.";
      code = 409;
    }
    return {
      statusCode: code,
      body: JSON.stringify({
        code: code,
        errMsg: errMsg
      }),
      headers: headers,
    };
  }
  return {
    statusCode: 201,
    body: JSON.stringify(response),
    headers: headers,
  };
}

export const handler = registerUser;
// .use(httpJsonBodyParser())
// .use(httpEventNormalizer())
// .use(httpErrorHandler())
// .use(cors())
// .use(
//   validator({
//     inputSchema: registerUserSchema,
//     ajvOptions: {
//       useDefaults: true,
//       strict: false,
//     },
//   })
// );