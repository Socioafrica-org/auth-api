import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import { config } from "dotenv";
import bodyParser from "body-parser";
import connect_mongodb from "./utils/db.config";
import signup_route from "./routes/signup.route";
import login_route from "./routes/login.route";
import otp_route from "./routes/otp.route";
import cookieParser from "cookie-parser";
import change_password_route from "./routes/change-password.route";
import users_route from "./routes/users.route";
import validate_token_route from "./routes/validate-token.route";

// * Load the environmental variables from the .env file to the process.ENV object
config();

// * Connect to the mongodb database
connect_mongodb();

// * Configure the appplications' port
const PORT = process.env.PORT || 5000;

// * Configure the express app
const app = express();

// * Log the HTTP request details and time
app.use((req: Request, res: Response, next: NextFunction) => {
  const time = new Date(Date.now()).toString();
  console.log(req.method, req.hostname, req.path, time);
  next();
});

// * Configure CORS
app.use(cors());
// * Parse the cookies sent to the http request to the 'req.cookies' property
app.use(cookieParser());
// * Enable the express app to parse REST JSON data
app.use(bodyParser.json());
// * Enable the express app to parse REST URL encoded data
app.use(bodyParser.urlencoded({ extended: true }));

// * Requests directed to the signup endpoint
app.use("/api/signup", signup_route);
// * Requests directed to the login endpoint
app.use("/api/login", login_route);
// * Requests directed to the otp endpoint
app.use("/api/otp", otp_route);
// * Requests directed to the change password endpoint
app.use("/api/change-password", change_password_route);
// * Requests directed to the users endpoint
app.use("/api/users", users_route);
// * Requests directed to the validate token endpoint
app.use("/api/validate-token", validate_token_route);

app.use("*", (req: Request, res: Response, next: NextFunction) => {
  const time = new Date(Date.now()).toString();
  console.error("NOT FOUND", req.method, req.hostname, req.path, time);
  return res.status(404).send("Not found");
});

app.use((err: any, req: Request, res: Response) => {
  console.error(err);
  return res.status(500).json("Internal server error");
});

app.listen(PORT, () => {
  console.log(`Application listening on port ${PORT}`);
});
