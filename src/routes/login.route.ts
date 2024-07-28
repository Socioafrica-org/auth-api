import { Router } from "express";
import { login } from "../controllers/login.controller";

const login_route = Router();

login_route.post("/", login);

export default login_route;
