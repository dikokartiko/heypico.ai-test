import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./env.js";
import * as middlewares from "./middlewares.js";
import routes from "./routes/index.js";

const app = express();

app.use(morgan("dev"));
app.use(helmet());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX_REQUESTS,
  message: "Too many requests from this IP, please try again later",
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

app.use(limiter);

app.get("/", (req, res) => {
  res.json({
    message: "hello world",
  });
});

app.use("/api", routes);

app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

export default app;
