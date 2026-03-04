import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

import { env } from "./env.js";
import * as middlewares from "./middlewares.js";
import routes from "./routes/index.js";

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Maps Search API",
      version: "1.0.0",
      description: "Google Maps search tool for Open WebUI",
    },
    servers: [
      {
        url: "http://localhost:3001",
      },
    ],
  },
  apis: ["./src/routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

const app = express();
const corsAllowlist = new Set(env.CORS_ALLOWED_ORIGINS);

app.set("trust proxy", 1);

app.use(morgan("dev"));
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || corsAllowlist.has(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
}));
app.use(express.json());

const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler(_req, res) {
    res.status(429).json({
      error: "Too many requests from this IP, please try again later",
    });
  },
});

app.use(limiter);

app.get("/", (req, res) => {
  res.json({
    message: "hello world",
  });
});

// Serve generated OpenAPI specification and optional Swagger UI.
app.get("/openapi.json", (req, res) => {
  res.type("application/json").send(swaggerSpec);
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api", routes);

app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

export default app;
