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
 * Endpoint responsible for validating the access/refresh token passed in the HTTP request
 * @param req The express js request object
 * @param res The express js response object
 */
export const validate_access_token = async (req: Request, res: Response) => {
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

/**
 * Endpoint responsible for decrypting the access/refresh token passed in the HTTP request
 * @param req The express js request object
 * @param res The express js response object
 */
export const decode_access_token = async (req: Request, res: Response) => {
  try {
    // * Verify if the acesss token and refresh is passed to the http request
    const extracted_tokens = extract_tokens_from_http_request(req.body, {
      cookie_access_token_name: token_names.ACCESS_TOKEN,
      cookie_refresh_token_name: token_names.REFRESH_TOKEN,
    });

    // * Decodes the JWT
    const decrypted_token = decode(extracted_tokens.access_token || "");

    // * Return the parsed access token data in the response object
    res.status(200).json({
      decrypted_token,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json("Internal server error");
  }
};
