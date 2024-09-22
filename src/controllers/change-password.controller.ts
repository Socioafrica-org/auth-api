import { Request, Response } from "express";
import UserModel from "../models/User.model";
import { handle_tokens, TokenBodyClass } from "../utils/utils";
import { ChangePasswordRequestType } from "../utils/types";
import { hash } from "bcrypt";

/**
 * * The function responsible for validating if a user exists, and creating access and refresh tokens to access the OTP endpoint when a user wahts to change his/her password
 * * The function enables the user to verify his email when he/she needs to update his/her password
 * @param req The Express Js request object
 * @param res The Express js response object
 * @returns void
 */
export const verify_email = async (
  req: Request<any, any, { email: string }>,
  res: Response
) => {
  try {
    const { email } = req.body;

    // * Get user with provided email
    const user = await UserModel.findOne({ email }).catch((e) =>
      console.error(`An error occured while connecting to the database: ${e}`)
    );

    if (!user) {
      console.error(`User ${email} doesn't exist`);
      return res.status(404).json("User doesn't exist");
    }

    // * Generates the access and refresh tokens for validating ones' email
    const tokens_res = await handle_tokens(
      {
        user_id: user._id?.toString(),
        username: user.username,
        verify_email: { email: user.email, change_password: true },
      },
      res
    );

    if (!tokens_res) {
      console.error("Could not generate tokens");
      return res.status(500).json("Internal server error");
    }

    // * Return a success code with the tokens to the client
    return res.status(201).json({
      message: "Password access and refresh tokens created successfully",
      ...new TokenBodyClass(
        tokens_res.tokens.access_token,
        tokens_res.tokens.refresh_token
      ),
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json("Internal server error");
  }
};

/**
 * * The function responsible for changing a user's password after he/she successfully verifies his email
 * @param req The Express Js request object
 * @param res The Express js response object
 * @returns void
 */
export const change_password = async (
  req: ChangePasswordRequestType<any, any, { password: string }>,
  res: Response
) => {
  try {
    // * Extract the password and user_id variables from the request
    const { password } = req.body;
    const { user_id } = req.token_data;

    // * Update User password with the newly created password
    const update_user = await UserModel.updateOne(
      { _id: user_id },
      { $set: { password: await hash(password, 10) } }
    );

    // * If the user password wasn't updated
    if (!update_user) {
      console.error(`Couldnt't update user password`);
      return res.status(500).json("Internal server error");
    }

    // * Return a success status if user password was updated
    return res.status(200).json("Updated password successfully");
  } catch (error) {
    console.log(error);
    return res.status(500).json("Internal server error");
  }
};
