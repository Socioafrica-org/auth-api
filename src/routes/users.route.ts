import { Router } from "express";
import { get_user, get_users } from "../controllers/users.controller";

const users_route = Router();

users_route.post("/", get_users);
users_route.post("/:user_id", get_user);

export default users_route;
