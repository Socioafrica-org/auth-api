import mongoose from "mongoose";

const refresh_token = new mongoose.Schema({
  id: { type: String, required: true },
  user_id: { type: String, required: true },
  expires_in: { type: Date, requred: true },
  valid_days: { type: Number, required: true },
  metadata: { type: Object },
});

const RefreshTokenModel = mongoose.model("refresh_tokens", refresh_token);

export default RefreshTokenModel;
