import { AccessTokenDataType } from "./types";
import { sign } from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import RefreshTokenModel from "../models/RefreshToken.model";
import { Response } from "express";

const jwt_secret = "jjnndnnsij193*#";
const encode_key = "9877jh77";

// * The user token data class
class UserTokenDataClass {
  constructor(public user_id: string) {}
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
    validate_email?: { email: string };
    change_password?: boolean;
    user_id: string;
  },
  res: Response
) => {
  // TODO: if the validate email property is set, verify if the user is authenticated (verified his/her email address)...
  // todo...if he / she is generate access & refresh tokens to access the app, else generate access & refresh tokens to the OTP endpoints
  if (config.validate_email) return;

  // * Generate access and refresh tokens
  const tokens = await generate_tokens({
    access_token: { data: { user_id: config.user_id } },
  });

  // * Set the access and refresh tokens as cookies
  res.cookie("access_token", tokens?.access_token);
  res.cookie("refresh_token", encode(tokens?.refresh_token || ""));

  return tokens;
};

/**
 * * Adds x number of days to a date
 * @example addDaysToDate(new Date().getTime(), 10)
 * @example addDaysToDate(10)
 * @param initialDate initial date in miliseconds
 * @param daysToAdd number of days to add
 * @returns new date
 */
const add_days_to_date = (
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
const add_time_to_date = (
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
    expires_in?: Date;
    secret?: string;
    data: AccessTokenDataType;
  };
  refresh_token?: {};

  type?: "otp" | "passowrd";
}) => {
  // TODO: IF the type is otp, generate "otp" access and refresh tokens
  if (config?.type === "otp") return;

  // TODO: IF the type is otp, generate "change password" access and refresh tokens
  if (config?.type === "passowrd") return;

  // * Generate access and refresh tokens for accessing the app
  const access_token = generate_access_token({
    data: config?.access_token?.data,
  });
  const refresh_token = await generate_refresh_token({
    data: config.access_token.data,
  });

  return { access_token, refresh_token };
};

/**
 * * Creates a new access token
 * @param config The access token configuration
 * @returns the access token
 */
const generate_access_token = (config: {
  expires_in?: Date;
  secret?: string;
  data: AccessTokenDataType;
}) => {
  const token = sign(config.data, config.secret || jwt_secret, {
    expiresIn: config?.expires_in?.getTime() || 60 * 5,
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
    ...config.data,
    expires_in:
      // * If the 'expires_in' parameter was not specified: let the token expire in the next 30 days
      !config.expires_in
        ? add_days_to_date(undefined, 7)
        : // * If the 'expires_in' parameter was set and the 'type' property was set to 'time': let the token expire in the specified amount of time (in seconds) from now
        config.expires_in.type === "time"
        ? add_time_to_date(undefined, config.expires_in.amount)
        : // * If the 'expires_in' parameter was set and the 'type' property was set to 'date': let the token expire in the specified amount of days from now
          add_days_to_date(undefined, config.expires_in.amount),
    valid_days:
      // * If the 'expires_in' parameter was not specified: let the token expire in the next 30 days
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
