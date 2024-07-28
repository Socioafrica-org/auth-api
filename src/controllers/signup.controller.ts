import { Request, Response } from "express";
import UserModel from "../models/User.model";
import { SignUpRequestBodyType } from "../utils/types";
import { hash } from "bcrypt";
import { handle_tokens, TokenBodyClass } from "../utils/utils";

/**
 * * Creates a new user in the database if he/she doesn't exist, generates an access and refresh token for the created user
 * @param req The request object
 * @param res The response object
 */
export const signup = async (
  req: Request<any, any, SignUpRequestBodyType>,
  res: Response
) => {
  const { body } = req;

  // TODO: Implement Google OAuth. If user signs up using Google OAuth

  // * Get user with provided email
  const user = await UserModel.findOne({ email: body.email });

  // * If user already exists return a 409 status code
  if (user) return res.status(409).send("User already exists");

  // * Create a new user in the Users collection
  const created_user = await UserModel.create({
    email: body.email,
    password: await hash(body.password, 10),
    authenticated: false,
    username: body.email,
    metadata: {
      first_name: body.first_name,
      last_name: body.last_name,
      phone_number: body.phone_number,
      gender: body.gender,
    },
  }).catch((e) => console.error(`Could not create new user due to ${e}`));

  if (!created_user) {
    return res.status(500).send("Internal server error");
  }

  // * Generates the access and refresh tokens for accessing the app/validating ones' email
  const tokens = await handle_tokens(
    { user_id: created_user._id?.toString() },
    res
  );

  if (!tokens) {
    console.error("Could not generate tokens");
    return res.status(500).send("Internal server error");
  }

  return res
    .status(201)
    .send(new TokenBodyClass(tokens.access_token, tokens.refresh_token));
};
