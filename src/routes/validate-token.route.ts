import { Router } from "express";
import { validate_access_token } from "../controllers/validate-token.controller";

const validate_token_route = Router();

validate_token_route.post("/", validate_access_token as any);

export default validate_token_route;
