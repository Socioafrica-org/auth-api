import { AccessTokenDataType, OTPTokensType, TokensType } from "./types";
import { JwtPayload, sign, verify } from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import RefreshTokenModel from "../models/RefreshToken.model";
import { CookieOptions, Request, Response } from "express";
import UserModel from "../models/User.model";
import nodemailer from "nodemailer";
import Mail, { Address } from "nodemailer/lib/mailer";
import { config } from "dotenv";

config();

export const jwt_secret = "jjnndnnsij193*#";
const encode_key = "9877jh77";
const cookie_options: CookieOptions = {
  domain: process.env.DOMAIN || "socio.africa",
  httpOnly: true,
  secure: true,
};

export enum token_names {
  ACCESS_TOKEN = "access_token",
  OTP_ACCESS_TOKEN = "otp_access_token",
  PASSWORD_ACCESS_TOKEN = "password_access_token",
  REFRESH_TOKEN = "refresh_token",
  OTP_REFRESH_TOKEN = "otp_refresh_token",
  PASSWORD_REFRESH_TOKEN = "password_refresh_token",
}

// * The response token object class
export class TokenBodyClass {
  constructor(public access_token: string, public refresh_token: string) {}
}

/**
 * * Encodes/encrypts a string
 * @param value The string to be encoded
 * @returns The encoded string
 */
export const encode = (value: string) => {
  return value;
};

/**
 * * Function responsible for managing access and refresh tokens for the app, OTP, and change password endpoints, and also setting the tokens as cookies
 * @param config: The token type configuration, and the users' id
 * @param res The response object
 * @returns An object containing the access and refresh tokens
 */
export const handle_tokens = async (
  config: {
    verify_email?: { email: string; change_password?: boolean };
    change_password?: boolean;
    user_id: string;
    username: string;
  },
  res: Response
): Promise<{ verified_email: boolean; tokens: TokensType } | undefined> => {
  // * If the verify_email property is set, verify if the user is authenticated (verified his/her email address)...
  // * if the user isn't authenticated, and he/she's not trying to change his/her password
  // * generate access & refresh tokens to the OTP endpoints, which will later be used to access the app
  // * if he / she is authenticated,
  // * check if the user needs to change his/her password
  // * if he/she does, generate access and refresh tokens to the OTP endpoints, which will later be used to change the password
  // * If he/she doesn't, generate access & refresh tokens to access the app
  if (config.verify_email) {
    const user = await UserModel.findOne({
      email: config.verify_email.email,
    }).catch((e) =>
      console.error(`An error occured while connecting to the database: ${e}`)
    );

    // * If the user doesn't exist
    if (!user) {
      console.error(`Could not find user with email ${config.verify_email}`);
      res.status(401).send("Invalid credentials");
      return;
    }

    let tokens: TokensType | undefined;
    let email_is_verified: boolean = false;

    // * If the User email is not verified (i.e. account was just created and email hasn't been verified), and the user's NOT trying to change his/her password
    // ! Change to (!user.authenticated) if error
    if (!user.authenticated && !config.verify_email.change_password) {
      // * Generate tokens to access the OTP endpoints, which wlll later be used to grant the user access to the platform
      tokens = await generate_tokens({
        access_token: {
          data: {
            email: config.verify_email.email,
            mode: "access_app",
            user_id: config.user_id,
          },
        },
        refresh_token: {
          // * Set the refresh token to expire in the next hour
          expires_in: { type: "time", amount: 60 * 60 },
        },
      });
    }

    // * If the user is authenticated, and change_password property is set to true, generate tokens for veritfying the user email in order to change his/her password
    if (config.verify_email.change_password) {
      // * Indicate that the user has a verified email address (upon sign up)
      email_is_verified = true;
      // * Generate tokens to access the OTP endpoints, which wlll later be used to change the user password
      tokens = await generate_tokens({
        access_token: {
          data: {
            email: config.verify_email.email,
            mode: "change_password",
            user_id: config.user_id,
          },
        },
        refresh_token: {
          // * Set the refresh token to expire in the next hour
          expires_in: { type: "time", amount: 60 * 60 },
        },
      });
    }

    // * If the tokens were generated
    if (tokens) {
      // * Set the OTP access and refresh tokens as cookies
      res.cookie(
        token_names.OTP_ACCESS_TOKEN,
        tokens?.access_token,
        cookie_options
      );
      res.cookie(
        token_names.OTP_REFRESH_TOKEN,
        tokens?.refresh_token,
        cookie_options
      );

      return { verified_email: email_is_verified, tokens: tokens };
    }
  }

  // * If the change_password property was set to true, i.e. User needs to change his/her password
  if (config.change_password) {
    // * Generate access and refresh tokens to access the endpoints responsible for changing the user password
    const tokens = await generate_tokens({
      access_token: {
        data: { user_id: config.user_id, username: config.username },
      },
      refresh_token: { expires_in: { type: "time", amount: 60 * 60 } },
    });

    // * Set the access and refresh tokens as cookies
    res.cookie(
      token_names.PASSWORD_ACCESS_TOKEN,
      tokens?.access_token,
      cookie_options
    );
    res.cookie(
      token_names.PASSWORD_REFRESH_TOKEN,
      tokens?.refresh_token,
      cookie_options
    );

    return { verified_email: true, tokens: tokens };
  }

  // * Generate access and refresh tokens to access the app platform
  const tokens = await generate_tokens({
    access_token: {
      data: { user_id: config.user_id, username: config.username },
    },
  });

  // * Set the access and refresh tokens as cookies
  res.cookie(token_names.ACCESS_TOKEN, tokens?.access_token, cookie_options);
  res.cookie(token_names.REFRESH_TOKEN, tokens?.refresh_token, cookie_options);

  return { verified_email: true, tokens: tokens };
};

/**
 * * Adds x number of days to a date
 * @example addDaysToDate(new Date().getTime(), 10)
 * @example addDaysToDate(10)
 * @param initialDate initial date in miliseconds
 * @param daysToAdd number of days to add
 * @returns new date
 */
export const add_days_to_date = (
  initial_date:
    | string
    | Date
    | number
    | null
    | undefined = new Date().getTime(),
  days_to_add: number
): Date => {
  // * Check if the initialDate parameter was passed but isn't a valid date
  if (
    initial_date !== null &&
    initial_date !== undefined &&
    new Date(initial_date).toDateString() === "Invalid Date"
  )
    throw new TypeError(`Invalid date specified`);

  // * Check if the daysToAdd parameter isn't a valid number
  if (typeof days_to_add !== "number")
    throw new TypeError(
      `Value passed into the 'days_to_add' parameter is not a number`
    );

  const current_date = initial_date ? new Date(initial_date) : new Date();
  current_date.setDate(current_date.getDate() + days_to_add);

  return current_date;
};

/**
 * * Adds x number of seconds to a date
 * @example add_time_to_date(new Date().getTime(), 60 * 60)
 * @example add_time_to_date(60 * 60)
 * @param initial_date initial date in miliseconds
 * @param seconds_to_add amount of seconds to add
 * @returns new date
 */
export const add_time_to_date = (
  initial_date:
    | string
    | Date
    | number
    | null
    | undefined = new Date().getTime(),
  seconds_to_add: number
): Date => {
  // Check if the initialDate parameter was passed but isn't a valid date
  if (
    initial_date !== null &&
    initial_date !== undefined &&
    new Date(initial_date).toDateString() === "Invalid Date"
  )
    throw new TypeError(`Invalid date specified`);

  // Check if the daysToAdd parameter isn't a valid number
  if (typeof seconds_to_add !== "number")
    throw new TypeError(
      `Value passed into the 'secondsToAdd' parameter is not a number`
    );

  const current_date = initial_date ? new Date(initial_date) : new Date();
  current_date.setSeconds(current_date.getSeconds() + seconds_to_add);

  return current_date;
};

/**
 * * Function responsible for generating the access and refresh tokens
 * @param config The access and refresh tokens oonfiguration
 * @returns An object containing the access and refresh token
 */
const generate_tokens = async (config: {
  access_token: {
    expires_in?: number;
    secret?: string;
    data: AccessTokenDataType;
  };
  refresh_token?: {
    expires_in: { type: "day" | "time"; amount: number };
  };

  type?: "otp" | "passowrd";
}): Promise<TokensType> => {
  // * Generate access and refresh tokens for accessing the app
  const access_token = generate_access_token({
    data: config?.access_token?.data,
  });
  const refresh_token = await generate_refresh_token({
    data: config.access_token.data,
    ...(config.refresh_token || {}),
  });

  return { access_token, refresh_token };
};

/**
 * * Creates a new access token
 * @param config The access token configuration
 * @returns the access token
 */
const generate_access_token = (config: {
  expires_in?: number;
  secret?: string;
  data: AccessTokenDataType;
}) => {
  const token = sign(config.data, config.secret || jwt_secret, {
    expiresIn: config?.expires_in || 60 * 5,
  });

  return token;
};

/**
 * * Generates a new refresh token id , and creates a new refresh token detail in the database
 * @param config The refresh token configuration
 * @returns The refresh toeken
 */
const generate_refresh_token = async (config: {
  data: AccessTokenDataType;
  expires_in?: { type: "day" | "time"; amount: number };
}) => {
  // * Generate a new refresh token id
  const refresh_token_id = uuidv4().split("-").join("");
  // * Create a new refresh token
  const create_refresh_token = await RefreshTokenModel.create({
    id: refresh_token_id,
    user_id: config.data?.user_id,
    metadata: { ...config.data },
    expires_in:
      // * If the 'expires_in' parameter was not specified: let the token expire in the next 7 days
      !config.expires_in
        ? add_days_to_date(undefined, 7)
        : // * If the 'expires_in' parameter was set and the 'type' property was set to 'time': let the token expire in the specified amount of time (in seconds) from now
        config.expires_in.type === "time"
        ? add_time_to_date(undefined, config.expires_in.amount)
        : // * If the 'expires_in' parameter was set and the 'type' property was set to 'date': let the token expire in the specified amount of days from now
          add_days_to_date(undefined, config.expires_in.amount),
    valid_days:
      // * If the 'expires_in' parameter was not specified: let the token expire in the next 7 days
      !config.expires_in
        ? 7
        : // * If the 'expires_in' parameter was set and the 'type' property was set to 'time': let the token expire in the specified amount of time (in seconds) from now
        config.expires_in.type === "time"
        ? (config.expires_in.amount / 86400).toFixed(2)
        : // * If the 'expires_in' parameter was set and the 'type' property was set to 'date': let the token expire in the specified amount of days from now
          config.expires_in.amount,
  }).catch((e) => console.error(`Could NOT create refresh token due to: ${e}`));

  // * If there was an error while creating the refresh token
  if (!create_refresh_token)
    throw new Error("An error occured while creating the refresh token");

  return refresh_token_id;
};

/**
 * * Function responsible for refreshing expired tokens
 * @param refresh_token_id The existing refresh token id
 * @returns The newly created refresh token OR undefined if token doesn't exist
 */
const refresh_refresh_token = async (
  refresh_token_id: string
): Promise<{
  status: 200 | 401;
  msg: string;
  token?: string;
  token_data?: AccessTokenDataType;
}> => {
  // * Retrieve the existing refresh token
  const old_token = await RefreshTokenModel.findOne({
    id: refresh_token_id,
  }).catch((e) =>
    console.error(`Could NOT retrieve refresh token due to: ${e}`)
  );

  // * If there was an error while retrieving the refresh token/the old token doesn't exist
  if (!old_token) {
    console.error("Token doesn't exist");
    return { status: 401, msg: "Token doesn't exist" };
  }
  // * Delete the existing refresh token
  const deleted_token = await RefreshTokenModel.deleteOne({
    id: refresh_token_id,
  }).catch((e) => console.error(`Could NOT delete refresh token due to: ${e}`));

  // * If there was an error while deleting the refresh token
  if (!deleted_token)
    throw new Error("An error occured while deleting the refresh token");

  // * Check if the existing refresh token is expired or not
  const current_date = Date.now();
  const expiry_date = new Date(old_token.expires_in || current_date).getTime();
  // * If the existing refresh token is expired
  if (current_date >= expiry_date) {
    console.error("Token expired");
    return { status: 401, msg: "Token expired" };
  }

  // * Generates a new refresh token id, and a new refresh token data off the previous one
  const new_token_id = uuidv4().split("-").join("");
  const new_token_data = { ...(old_token as any)._doc, id: new_token_id };
  // * Deletes the mongodb id identifier of the previous refresh token
  delete new_token_data._id;

  // * Create a new refresh token with a new refresh token id
  const created_token = await RefreshTokenModel.create({
    ...new_token_data,
  }).catch((e) => console.error(`Could NOT create refresh token due to: ${e}`));

  // * If there was an error while creating the refresh token
  if (!created_token)
    throw new Error("An error occured while creating the refresh token");

  // * Return the refreshed token alongside it's metadata, i.e. the token data
  return {
    status: 200,
    msg: "Token refreshed",
    token: created_token.id,
    token_data: { ...created_token.metadata },
  };
};

/**
 * * The function responsible for validating access and refresh tokens passed to a request
 * @param config The access and reshresh tokens to validate
 * @returns An object containing the 'status' property, and token data. The status returns 401 when the user access/refresh token isn't valid, alongside the reason in the 'msg' property
 */
export const validate_tokens = async (
  config: {
    access_token?: string;
    refresh_token?: string;
    type?: "access_app" | "otp" | "change_password";
  },
  res: Response
): Promise<{
  status: 200 | 401;
  msg?: string;
  tokens?: TokensType;
  token_data?: AccessTokenDataType;
}> => {
  // * Validate the access token
  let token_is_verified: JwtPayload | string | undefined = undefined;

  // * If the access token was provided
  if (config.access_token) {
    try {
      // * verify if the access token is still valid
      token_is_verified = verify(config.access_token, jwt_secret);
    } catch (error) {
      token_is_verified = (error as any).message;
    }
  }

  // * If the access token is valid return the token data, (the verify function returns a string containing the error message if the token is not verified)
  if (typeof token_is_verified === "object")
    return {
      status: 200,
      token_data: token_is_verified as AccessTokenDataType,
      tokens: new TokenBodyClass(
        config.access_token || "",
        config.refresh_token || ""
      ),
    };

  // * If access token is not valid and refresh token wasn't provided, return unauthorized
  if (!config.refresh_token)
    return {
      status: 401,
      msg: token_is_verified || "Invalid access token",
    };

  // * If access token is not valid or was not provided, BUT the refresh token was...
  const refreshed_token = await refresh_refresh_token(config.refresh_token);

  // * if the token was NOT refreshed, due to it doesn't exist, or it has expired
  if (refreshed_token.status !== 200)
    return {
      status: 401,
      msg: refreshed_token.msg || "Invalid refresh token",
    };

  // * Generate a new access token for the user
  const access_token = generate_access_token({
    data: refreshed_token.token_data as AccessTokenDataType,
  });

  // * Set the access and refresh tokens as cookies
  res.cookie(
    config.type === "otp"
      ? token_names.OTP_ACCESS_TOKEN
      : config.type === "change_password"
      ? token_names.PASSWORD_ACCESS_TOKEN
      : token_names.ACCESS_TOKEN,
    access_token,
    cookie_options
  );
  res.cookie(
    config.type === "otp"
      ? token_names.OTP_REFRESH_TOKEN
      : config.type === "change_password"
      ? token_names.PASSWORD_REFRESH_TOKEN
      : token_names.REFRESH_TOKEN,
    refreshed_token.token,
    cookie_options
  );

  // * Return the new access and refresh tokens
  return {
    status: 200,
    token_data: refreshed_token.token_data as AccessTokenDataType,
    tokens: new TokenBodyClass(access_token, refreshed_token.token || ""),
  };
};

/**
 * * Extracts the access and refresh tokens from the cookies or request header
 * @param req The express Js request object
 * @param config
 * @returns The extracted access and refresh tokens
 */
export const extract_tokens_from_http_request = (
  req: Request,
  config?: {
    cookie_access_token_name?: string;
    cookie_refresh_token_name?: string;
  }
): { access_token: string | undefined; refresh_token: string | undefined } => {
  // * Get the refresh token from the cookie or header
  const refresh_token =
    req.cookies?.[config?.cookie_refresh_token_name || "refresh_token"] ||
    req.headers["refresh-token"] ||
    undefined;
  // * The access token variable should be initially undefined
  let access_token: string | undefined = undefined;
  // * Get the access_token from the cookie
  const token_from_cookies =
    req.cookies?.[config?.cookie_access_token_name || "access_token"];
  // * If the access token was provided in the cookies
  if (token_from_cookies) {
    // * Update the access token variable with the access token in the cookie
    access_token = token_from_cookies;
  } else {
    // * If the header includes the Authorization property
    if (Object.keys(req.headers).includes("authorization")) {
      // * Get the value of the authorization header
      const auth = req.headers.authorization;
      // * If the authorization header is prefixed with 'Bearer', i.e. is an access token
      if (auth?.split(" ")[0] === "Bearer") access_token = auth.split(" ")[1];
    }
  }

  return { access_token: access_token, refresh_token: refresh_token };
};

/**
 * * Generate a random 6 digit string
 * @returns A random 6 digit string
 */
export const generate_random_6_digit_string = () => {
  let gen = (n: number) =>
    [...Array(n)].map((_) => (Math.random() * 10) | 0).join("");

  // TEST: generate 6 digit number
  // first number can't be zero - so we generate it separatley
  let six_digit_str = ((1 + Math.random() * 9) | 0) + gen(5);

  return six_digit_str;
};

/**
 * * Generates a HTML email template for the OTP token
 * @param token The generated token to be sent to the user's email
 * @returns
 */
export const get_otp_email_template = (token: string) => {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
  <html xmlns="http://www.w3.org/1999/xhtml">
  
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify your login</title>
    <!--[if mso]><style type="text/css">body, table, td, a { font-family: Arial, Helvetica, sans-serif !important; }</style><![endif]-->
  </head>
  
  <body style="font-family: Helvetica, Arial, sans-serif; margin: 0px; padding: 0px; background-color: rgba(254,195,205, 0.5);">
    <table role="presentation"
      style="width: 100%; border-collapse: collapse; border: 0px; border-spacing: 0px; font-family: Arial, Helvetica, sans-serif; background-color: rgb(239, 239, 239);">
      <tbody>
        <tr>
          <td align="center" style="padding: 1rem 2rem; vertical-align: top; width: 100%;">
            <table role="presentation" style="max-width: 600px; border-collapse: collapse; border: 0px; border-spacing: 0px; text-align: left;">
              <tbody>
                <tr>
                  <td style="padding: 40px 0px 0px;">
                    <div style="text-align: left;">
                      <div style="padding-bottom: 20px;"><img src="https://www.socio.africa/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo.83d3c436.png&w=128&q=75" alt="Company" style="width: 56px;"></div>
                    </div>
                    <div style="padding: 20px; background-color: rgb(255, 255, 255);">
                      <div style="color: rgb(0, 0, 0); text-align: left;">
                        <h1 style="margin: 1rem 0">Email verification code</h1>
                        <p style="padding-bottom: 16px">Please use the verification code below to sign in.</p>
                        <p style="padding-bottom: 16px"><strong style="font-size: 130%; color: #018209;">${token}</strong></p>
                        <p style="padding-bottom: 16px">If you didn't request this, you can ignore this email.</p>
                        <p style="padding-bottom: 16px">Love from <br>The Socio.africa team</p>
                      </div>
                    </div>
                    
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
  
  </html>`;
};

/**
 * * Function responsible for sending mail to a particular email address
 * @param content The object containing the details of the email to be sent like 'from' and 'to' addresses, the email 'subject' and 'bosy'
 * @returns an array in which the first element is 'true' if the email was sent successfully and 'false' otherwise
 */
export const send_mail = async (
  content: Mail.Options
): Promise<{ status: boolean; msg: string | (string | Address)[] }> => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MAIL_ACCOUNT_EMAIL,
      pass: process.env.MAIL_ACCOUNT_PASSWORD,
    },
  });

  const response = await transporter.sendMail(content);

  if (response.accepted) return { status: true, msg: response.response };
  else return { status: false, msg: response.rejected };
};
