import { Request } from "express";

export type SignUpRequestBodyType = {
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  gender: string;
  password: string;
};

export type LoginRequestBodyType = {
  email: string;
  password: string;
};

export type OTPTokenDataType = {
  email: string;
  mode: "change_password" | "access_app";
  user_id: string;
};

export type AccessTokenDataType =
  | {
      user_id: string;
    }
  | OTPTokenDataType;

export type TokensType = {
  access_token: string;
  refresh_token: string;
};

export type OTPTokensType = {
  access_token: string;
  refresh_token: string;
};

export type OTPRequestType = Request & { token_data: OTPTokenDataType };
export type ChangePasswordRequestType<
  T = any,
  P = any,
  Q = any,
  R = any
> = Request<T, P, Q, R> & {
  token_data: AccessTokenDataType;
};

type TUserModelMetaData = {
  first_name: string;
  last_name: string;
  phone_number: string;
  gender: string;
  image: string;
};

export type TUserDetailResponse = TUserModelMetaData & { username: string };

export type TUserModel = {
  email: string;
  password: string;
  username: string;
  authenticated: boolean;
  metadata: TUserModelMetaData;
};
