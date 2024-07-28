import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import { config } from "dotenv";
import bodyParser from "body-parser";
import connect_mongodb from "./utils/db.config";
import signup_route from "./routes/signup.route";
import login_route from "./routes/login.route";

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
// * Enable the express app to parse REST JSON data
app.use(bodyParser.json());
// * Enable the express app to parse REST URL encoded data
app.use(bodyParser.urlencoded({ extended: true }));

// * Requests directed to the signup endpoint
app.use("/api/signup", signup_route);
// * Requests directed to the login endpoint
app.use("/api/login", login_route);

app.use("*", (req: Request, res: Response, next: NextFunction) => {
  const time = new Date(Date.now()).toString();
  console.error("NOT FOUND", req.method, req.hostname, req.path, time);
  return res.status(404).send("Not found");
});

app.listen(PORT, () => {
  console.log(`Application listening on port ${PORT}`);
});
