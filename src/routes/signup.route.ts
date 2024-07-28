import { Router } from "express";
import { signup } from "../controllers/signup.controller";

const signup_route = Router();

signup_route.post("/", signup);

export default signup_route;
