import { NextFunction, Request, Response } from "express";
import {
  extract_tokens_from_http_request,
  token_names,
  validate_tokens,
} from "../utils/utils";
import {
  AccessTokenDataType,
  ChangePasswordRequestType,
  OTPRequestType,
  OTPTokenDataType,
} from "../utils/types";

/**
 * Middleware responsible for validating the access/refresh token passed in the HTTP request
 * @param req The express js request object
 * @param res The express js response object
 * @param next The Function to proceed to the next step in processing the API request
 */
export const validate_change_password_access_token = async (
  req: ChangePasswordRequestType,
  res: Response,
  next: NextFunction
) => {
  try {
    // * Verify if the acesss token and refresh it if it is valid
    const extracted_tokens = extract_tokens_from_http_request(req, {
      cookie_access_token_name: token_names.PASSWORD_ACCESS_TOKEN,
      cookie_refresh_token_name: token_names.PASSWORD_REFRESH_TOKEN,
    });
    const validate_tokens_response = await validate_tokens(
      { ...extracted_tokens, type: "change_password" },
      res
    );
    // * If the token is not valid, return 401 error
    if (validate_tokens_response.status !== 200) {
      console.error(`Authorization error: ${validate_tokens_response.msg}`);
      return res.status(401).json("Unauthorized user");
    }

    // * Add the parsed Change Password access token data to the request object
    req.token_data = validate_tokens_response.token_data as AccessTokenDataType;
    next();
  } catch (error) {
    console.log(error);
    return res.status(500).json("Internal server error");
  }
};
