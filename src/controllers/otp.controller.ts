import { Response } from "express";
import { OTPRequestType, OTPTokenDataType } from "../utils/types";
import UserModel from "../models/User.model";
import {
  add_time_to_date,
  encode,
  generate_random_6_digit_string,
  get_otp_email_template,
  handle_tokens,
  send_mail,
  TokenBodyClass,
} from "../utils/utils";
import OTPModel from "../models/OTP.model";

/**
 * The function responsible for creating OTP and sending it to user's email address
 * @param req The Express Js request object
 * @param res The Express Js response object
 * @returns Void
 */
export const create_otp = async (req: OTPRequestType, res: Response) => {
  try {
    const email = req.token_data.email;
    // * Check if the user with the provided email address exists
    const user = await UserModel.findOne({ email }).catch((e) =>
      console.error(`An error occured while connecting to the database: ${e}`)
    );
    // * If the user doesn't exist, return a 404 error
    if (!user) {
      console.error(`User with email: ${email} doesn't exist`);
      return res.status(404).json("Email doesn't exist");
    }

    // * Delete any existing OTP with the provided email address
    const deleted_token = await OTPModel.deleteMany({
      email,
    }).catch((e) =>
      console.error(`An error occured while connecting to the database: ${e}`)
    );

    if (!deleted_token)
      return res.status(500).json("Could not delete existing tokens");

    // * Generate a random 6 digit number, i.e. the OTP
    const token = generate_random_6_digit_string();
    // * Add the OTP to the OTP collection/database (hash the OTP before inserting it to the collection)
    const created_otp = await OTPModel.create({
      email: email,
      token: encode(token),
      expires_in: add_time_to_date(undefined, 60 * 60),
    }).catch((e) =>
      console.error(`An error occured while connecting to the database: ${e}`)
    );
    // * If otp couldn't be added to the collection, return 500 error
    if (!created_otp) {
      console.error(`Could not add OTP to the OTP collection`);
      return res.status(500).json("Internal server error");
    }

    // * Send the OTP to the user's email address gotten from the user access token
    const sent_email = await send_mail({
      from: process.env.MAIL_ACCOUNT_EMAIL,
      to: email,
      subject: "Confirm your email address",
      html: get_otp_email_template(token),
    });

    console.log(`Send OTP to email status: ${sent_email.msg}`);

    // * Return a 201 response
    return res
      .status(201)
      .json("OTP successfully created and sent to email address");
  } catch (error) {
    console.log(error);
    return res.status(500).json("Internal server error");
  }
};

/**
 * The function responsible for validating OTP sent to user's email address
 * @param req The Express Js request object
 * @param res The Express Js response object
 * @returns Void
 */
export const verify_otp = async (req: OTPRequestType, res: Response) => {
  try {
    const email = req.token_data.email;
    const passed_otp: string = req.body.otp;
    // * Check if the user with the provided email address exists
    const user = await UserModel.findOne({ email }).catch((e) =>
      console.error(`An error occured while connecting to the database: ${e}`)
    );
    // * If the user doesn't exist, return a 404 error
    if (!user) {
      console.error(`User with email: ${email} doesn't exist`);
      return res.status(404).json("Email doesn't exist");
    }

    // * Check if the provided OTP matches that in the database, i.e. if there exists any field in the OTP collection with the provided email address
    const retrieved_otp = await OTPModel.findOne({
      email,
      token: encode(passed_otp),
    }).catch((e) =>
      console.error(`An error occured while connecting to the database: ${e}`)
    );
    // * If the provided OTP doesn't exist in the database
    if (!retrieved_otp) {
      console.error(`Provided OTP doesn't exist`);
      return res.status(400).json("Invalid OTP");
    }
    // * Validate if the token provided is expired
    if (new Date(retrieved_otp.expires_in) <= new Date())
      return res.status(400).json("Invalid OTP");

    // * Set the authenticated status of the user data to true if it was false
    if (user.authenticated === false) {
      const updated_user = await UserModel.updateOne(
        { _id: user._id, email },
        { authenticated: true }
      ).catch((e) =>
        console.error(`An error occured while connecting to the database: ${e}`)
      );
      // * If there was an issue updating the user, return 500 error
      if (!updated_user) {
        console.error("Could not authenticate user");
        res.status(500).json("Internal server error");
      }
    }

    // * Delete the otp from the collection
    await OTPModel.deleteOne({
      email,
      token: encode(passed_otp),
    }).catch((e) =>
      console.error(`An error occured while connecting to the database: ${e}`)
    );

    // * If the OTP mode is 'access_app', generate access and refresh tokens to access the platform
    if (req.token_data.mode === "access_app") {
      const tokens_res = await handle_tokens(
        { user_id: user._id.toString(), username: user.username },
        res
      );

      // * Return 500 error if tokens couldn't be generated
      if (!tokens_res) {
        console.error("Could not generate tokens");
        return res.status(500).send("Internal server error");
      }

      return res
        .status(200)
        .json(
          new TokenBodyClass(
            tokens_res.tokens.access_token,
            tokens_res.tokens.refresh_token
          )
        );
    }
    // * If the mode is 'change_password', generate access and refresh tokens to change the user password
    if (req.token_data.mode === "change_password") {
      const tokens_res = await handle_tokens(
        {
          user_id: user._id.toString(),
          change_password: true,
          username: user.username,
        },
        res
      );

      // * Return 500 error if tokens couldn't be generated
      if (!tokens_res) {
        console.error("Could not generate tokens");
        return res.status(500).send("Internal server error");
      }

      return res
        .status(200)
        .json(
          new TokenBodyClass(
            tokens_res.tokens.access_token,
            tokens_res.tokens.refresh_token
          )
        );
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json("Internal server error");
  }
};
