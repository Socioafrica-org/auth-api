import { Request, Response } from "express";
import UserModel from "../models/User.model";
import { SignUpRequestBodyType } from "../utils/types";
import { hash } from "bcrypt";
import { create_username, handle_tokens, TokenBodyClass } from "../utils/utils";

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

  // * Creates a unique username for the user
  const username = await create_username(body.first_name, body.last_name);

  // * Create a new user in the Users collection
  const created_user = await UserModel.create({
    email: body.email,
    password: await hash(body.password, 10),
    authenticated: false,
    username,
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
  // ? Uncomment when implementing verify email feature
  // const tokens_res = await handle_tokens(
  //   {
  //     user_id: created_user._id?.toString(),
  //     verify_email: { email: created_user.email },
  //   },
  //   res
  // );
  const tokens_res = await handle_tokens(
    {
      user_id: created_user._id?.toString(),
      username: created_user.username,
    },
    res
  );

  if (!tokens_res) {
    console.error("Could not generate tokens");
    return res.status(500).send("Internal server error");
  }

  // ? Uncomment when implementing verify email feature
  // return res.status(403).json({
  //   message: "Unverified email address",
  //   ...new TokenBodyClass(
  //     tokens_res.tokens.access_token,
  //     tokens_res.tokens.refresh_token
  //   ),
  // });

  // ! Comment out when implementing the verfy email feature
  return res
    .status(200)
    .json(
      new TokenBodyClass(
        tokens_res.tokens.access_token,
        tokens_res.tokens.refresh_token,
        created_user.username,
        created_user.metadata.image
      )
    );
};
