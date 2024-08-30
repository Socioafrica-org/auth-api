import { Request, Response } from "express";
import {
  extract_tokens_from_http_request,
  jwt_secret,
  token_names,
  validate_tokens,
} from "../utils/utils";
import { AccessTokenDataType } from "../utils/types";
import { decode } from "jsonwebtoken";

/**
 * Middleware responsible for validating the access/refresh token passed in the HTTP request
 * @param req The express js request object
 * @param res The express js response object
 * @param next The Function to proceed to the next step in processing the API request
 */
export const validate_access_token = async (
  req: Request<any, any, Request> & {
    token_data: AccessTokenDataType;
  },
  res: Response
) => {
  try {
    // * Verify if the acesss token and refresh it if it is valid
    const extracted_tokens = extract_tokens_from_http_request(req.body, {
      cookie_access_token_name: token_names.ACCESS_TOKEN,
      cookie_refresh_token_name: token_names.REFRESH_TOKEN,
    });
    const validate_tokens_response = await validate_tokens(
      { ...extracted_tokens, type: "access_app" },
      res
    );
    // * If the token is not valid, return 401 error
    if (validate_tokens_response.status !== 200) {
      console.error(`Authorization error: ${validate_tokens_response.msg}`);
      return res.status(401).json("Unauthorized user");
    }

    // * Return the parsed access token data in the response object
    res.status(200).json({
      tokens: validate_tokens_response.tokens,
      data: validate_tokens_response.token_data,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json("Internal server error");
  }
};
