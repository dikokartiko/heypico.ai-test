import { afterEach, describe, expect, it, vi } from "vitest";

async function loadMiddlewares(envOverride) {
  vi.resetModules();

  let mocked = false;
  if (envOverride) {
    mocked = true;
    vi.doMock("../src/env.js", () => ({
      env: envOverride,
    }));
  }

  const module = await import("../src/middlewares.js");

  if (mocked) {
    vi.doUnmock("../src/env.js");
  }

  return module;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("middlewares", () => {
  it("notFound marks request as 404 and forwards error", async () => {
    const { notFound } = await loadMiddlewares();
    const req = { originalUrl: "/missing" };
    const res = {
      status: vi.fn().mockReturnThis(),
    };
    const next = vi.fn();

    notFound(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("- Not Found - /missing");
  });

  it("errorHandler returns stack in non-production environments", async () => {
    const { errorHandler } = await loadMiddlewares();
    const err = new Error("Boom");
    const res = {
      statusCode: 200,
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    errorHandler(err, {}, res, () => {});

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Boom",
      stack: err.stack,
    });
  });

  it("errorHandler sanitizes stack traces in production", async () => {
    const { errorHandler } = await loadMiddlewares({
      NODE_ENV: "production",
    });
    const err = new Error("Boom");
    const res = {
      statusCode: 200,
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    errorHandler(err, {}, res, () => {});

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Boom",
      stack: expect.any(String),
    });
    const payload = res.json.mock.calls[0][0];
    expect(payload.stack).not.toBe(err.stack);
    expect(payload.stack.length).toBeGreaterThan(0);
  });
});

