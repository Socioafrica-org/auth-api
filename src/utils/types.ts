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
