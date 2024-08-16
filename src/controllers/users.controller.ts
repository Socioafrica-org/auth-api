import { Request, Response } from "express";
import UserModel from "../models/User.model";
import { TUserDetailResponse } from "../utils/types";

/**
 * * Retrieves all the users from the database
 * @param req The request object
 * @param res The response object
 */
export const get_users = async (req: Request, res: Response) => {
  try {
    // * Retrieves all the users from the database
    const users = await UserModel.find();

    if (!users) {
      console.error(`No users in the dtabase`);
      return res.status(404).send("No users");
    }

    // * List containing users and their public info only
    const parsed_users: TUserDetailResponse[] = [];

    // * Loops through all users in the database
    for (const user of users) {
      // * Retrieves only the important info concerning a user
      const parsed_user: TUserDetailResponse = {
        ...user.metadata,
        username: user.username,
      };

      // * Adds the parsed user to the list of parsed users
      parsed_users.push(parsed_user);
    }

    return res.status(200).json(parsed_users);
  } catch (error) {
    console.error(error);
    return res.status(500).json("An error occured");
  }
};

/**
 * * Retrieves a single user from the database
 * @param req The request object
 * @param res The response object
 */
export const get_user = async (
  req: Request<{ user_id: string }>,
  res: Response
) => {
  try {
    const { user_id } = req.params;
    // * Retrieves a user with the entered user id
    const user = await UserModel.findOne({ _id: user_id });

    if (!user) {
      console.error(`User ${user_id} doesn't exist`);
      return res.status(404).send("User not found");
    }

    // * Retrieves only the important info concerning a user
    const parsed_user: TUserDetailResponse = {
      ...user.metadata,
      username: user.username,
    };

    return res.status(200).json(parsed_user);
  } catch (error) {
    console.error(error);
    return res.status(500).json("An error occured");
  }
};
