import request from "supertest";
import { describe, it, beforeEach, expect } from "vitest";

import app from "../src/app.js";

describe("app", () => {
  it("responds with a not found message", () =>
    request(app)
      .get("/what-is-this-even")
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(404));
});

describe("GET /", () => {
  it("responds with a json message", () =>
    request(app)
      .get("/")
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(200, {
        message: "hello world",
      }));
});

// Create a separate app instance with lower rate limits for testing
function createTestAppWithRateLimit() {
  const express = require("express");
  const rateLimit = require("express-rate-limit").default;
  const app = express();

  // Add rate limiter with lower limits for testing
  const testLimiter = rateLimit({
    windowMs: 1500, // 1.5 second window
    limit: 2, // Limit each IP to 2 requests per windowMs
    message: {
      message: "Too many requests from this IP, please try again later",
    },
    standardHeaders: "draft-7",
    legacyHeaders: false,
  });

  app.use(testLimiter);
  app.get("/", (req, res) => {
    res.json({ message: "hello world" });
  });

  return app;
}

describe("Rate Limiting", () => {
  it("allows requests within the rate limit", async () => {
    const testApp = createTestAppWithRateLimit();
    const agent = request(testApp);

    // First request should be OK
    await agent.get("/").expect(200);

    // Second request should still be OK (within limit of 2)
    await agent.get("/").expect(200);
  });

  it("blocks requests after exceeding the rate limit", async () => {
    const testApp = createTestAppWithRateLimit();
    const agent = request(testApp);

    // First request should be OK
    await agent.get("/").expect(200);

    // Second request should still be OK (within limit of 2)
    await agent.get("/").expect(200);

    // Third request should be blocked (exceeds limit of 2)
    await agent.get("/").expect(429).expect("Content-Type", /json/);
  });

  it("returns proper rate limit headers", async () => {
    const testApp = createTestAppWithRateLimit();
    const response = await request(testApp).get("/").expect(200);

    // Check if rate limit headers are present (from express-rate-limit with standardHeaders: "draft-7")
    expect(response.headers).toHaveProperty("ratelimit");
    expect(response.headers).toHaveProperty("ratelimit-policy");
  });
});
