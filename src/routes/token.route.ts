import { Router } from "express";
import {
  validate_access_token,
  decode_access_token,
} from "../controllers/token.controller";

const token_route = Router();

token_route.post("/validate", validate_access_token);
token_route.post("/decode", decode_access_token);

export default token_route;
