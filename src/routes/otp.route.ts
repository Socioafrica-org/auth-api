import { Router } from "express";
import { create_otp, verify_otp } from "../controllers/otp.controller";
import { validate_otp_access_token } from "../middlewares/otp.middleware";

const otp_route = Router();
// * Middleware to check and verify OTP access and refresh tokens
otp_route.use(validate_otp_access_token as any);

otp_route.post("/create", create_otp as any);
otp_route.post("/verify", verify_otp as any);

export default otp_route;
