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
    delete process.env.NODE_ENV;
    delete process.env.PORT;
    delete process.env.RATE_LIMIT_WINDOW_MS;
    delete process.env.RATE_LIMIT_MAX_REQUESTS;

    const { env } = await import("../src/env.js");

    expect(env).toMatchObject({
      NODE_ENV: "development",
      PORT: 3000,
      RATE_LIMIT_WINDOW_MS: 90000,
      RATE_LIMIT_MAX_REQUESTS: 100,
    });
  });

  it("logs and exits when validation fails", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined);
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    process.env.RATE_LIMIT_WINDOW_MS = "not-a-number";

    await expect(import("../src/env.js")).rejects.toThrow();

    expect(consoleSpy).toHaveBeenCalledWith(
      "Missing environment variables:",
      expect.arrayContaining(["RATE_LIMIT_WINDOW_MS"]),
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("logs unexpected errors from schema parsing", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined);
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const unexpectedError = new Error("Unexpected failure");

    vi.doMock("zod/v4", () => {
      class FakeZodError extends Error {}
      const schema = {
        parse: () => {
          throw unexpectedError;
        },
      };
      const defaultable = {
        default: () => schema,
      };
      const z = {
        object: () => schema,
        enum: () => defaultable,
        coerce: {
          number: () => defaultable,
        },
        ZodError: FakeZodError,
      };
      z.ZodError = FakeZodError;
      return { z };
    });

    try {
      await expect(import("../src/env.js")).rejects.toThrow("Unexpected failure");
      expect(consoleSpy).toHaveBeenCalledWith(unexpectedError);
      expect(exitSpy).toHaveBeenCalledWith(1);
    }
    finally {
      vi.doUnmock("zod/v4");
    }
  });
});
