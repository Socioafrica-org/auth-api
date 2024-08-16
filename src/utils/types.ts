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

export type AccessTokenDataType = {
  user_id: string;
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
