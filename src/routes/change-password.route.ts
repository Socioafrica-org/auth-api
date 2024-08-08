import { validate_change_password_access_token } from "./../middlewares/change-password.middleware";
import { Router } from "express";
import {
  change_password,
  verify_email,
} from "../controllers/change-password.controller";

const change_password_route = Router();

change_password_route.post("/verify", verify_email as any);

// * Added middleware to check and verify Password access and refresh tokens
change_password_route.patch(
  "/change",
  validate_change_password_access_token as any,
  change_password as any
);

export default change_password_route;
