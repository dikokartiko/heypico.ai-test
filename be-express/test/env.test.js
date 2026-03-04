import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = process.env;

describe("env configuration", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    vi.restoreAllMocks();
  });

  it("parses environment variables and applies defaults", async () => {
    process.env.GOOGLE_MAPS_API_KEY = "server-key";
    process.env.CORS_ALLOWED_ORIGINS = "http://localhost:3000, http://localhost:8080";
    delete process.env.NODE_ENV;
    delete process.env.PORT;
    delete process.env.RATE_LIMIT_WINDOW_MS;
    delete process.env.RATE_LIMIT_MAX_REQUESTS;

    const { env } = await import("../src/env.js");

    expect(env).toMatchObject({
      CORS_ALLOWED_ORIGINS: ["http://localhost:3000", "http://localhost:8080"],
      GOOGLE_MAPS_API_KEY: "server-key",
      MAPS_RATE_LIMIT_MAX_REQUESTS: 30,
      MAPS_RATE_LIMIT_WINDOW_MS: 60000,
      NODE_ENV: "development",
      PORT: 3000,
      RATE_LIMIT_MAX_REQUESTS: 100,
      RATE_LIMIT_WINDOW_MS: 90000,
    });
  });

  it("uses a safe placeholder key in test environment", async () => {
    process.env.NODE_ENV = "test";
    delete process.env.GOOGLE_MAPS_API_KEY;

    const { env } = await import("../src/env.js");

    expect(env.GOOGLE_MAPS_API_KEY).toBe("test-google-maps-key");
  });

  it("logs and exits when validation fails", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    process.env.NODE_ENV = "production";
    process.env.GOOGLE_MAPS_API_KEY = "server-key";
    process.env.RATE_LIMIT_WINDOW_MS = "not-a-number";

    await expect(import("../src/env.js")).rejects.toThrow("process.exit");

    expect(consoleSpy).toHaveBeenCalledWith(
      "Missing environment variables:",
      expect.arrayContaining(["RATE_LIMIT_WINDOW_MS"]),
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("logs and exits when Google Maps key is missing outside tests", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    process.env.NODE_ENV = "production";
    delete process.env.GOOGLE_MAPS_API_KEY;

    await expect(import("../src/env.js")).rejects.toThrow("process.exit");

    expect(consoleSpy).toHaveBeenCalledWith(
      "Missing environment variables:",
      expect.arrayContaining(["GOOGLE_MAPS_API_KEY"]),
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
