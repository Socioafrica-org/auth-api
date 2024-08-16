import mongoose from "mongoose";

const otp = new mongoose.Schema({
  email: { type: String, required: true },
  token: { type: String, required: true },
  expires_in: { type: Date, required: true },
  expireAt: { type: Date, expires: 60 * 60 },
});

const OTPModel = mongoose.model("OTP", otp);

export default OTPModel;
