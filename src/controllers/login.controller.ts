import { Request, Response } from "express";
import UserModel from "../models/User.model";
import { LoginRequestBodyType } from "../utils/types";
import { compare } from "bcrypt";
import { handle_tokens, TokenBodyClass } from "../utils/utils";

/**
 * * Validates if a user exists in the database, and has the right password; if he/she exists, generates an access and refresh token for the user
 * @param req The request object
 * @param res The response object
 */
export const login = async (
  req: Request<any, any, LoginRequestBodyType>,
  res: Response
) => {
  const { body } = req;

  // TODO: Implement Google OAuth. If user signs up using Google OAuth

  // * Get user with provided email
  const user = await UserModel.findOne({ email: body.email }).catch((e) =>
    console.error(`An error occured while connecting to the database: ${e}`)
  );

  if (!user) {
    console.error(`User ${body.email} doesn't exist`);
    return res.status(401).send("Invalid credentials");
  }

  // * Validates user password
  if (!(await compare(body.password, user.password)))
    return res.status(401).send("Invalid credentials");

  // * Generates the access and refresh tokens for accessing the app/validating ones' email
  const tokens_res = await handle_tokens(
    { user_id: user._id?.toString(), verify_email: { email: user.email } },
    res
  );

  if (!tokens_res) {
    console.error("Could not generate tokens");
    return res.status(500).send("Internal server error");
  }

  // * If the user email is NOT verified
  if (!tokens_res.verified_email)
    return res
      .status(403)
      .json({
        message: "Unverified email address",
        ...new TokenBodyClass(
          tokens_res.tokens.access_token,
          tokens_res.tokens.refresh_token
        ),
      });

  // * If the user email is verified
  return res
    .status(200)
    .json(
      new TokenBodyClass(
        tokens_res.tokens.access_token,
        tokens_res.tokens.refresh_token
      )
    );
};
