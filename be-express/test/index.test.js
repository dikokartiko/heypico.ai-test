import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const listenMock = vi.fn();

vi.mock("../src/app.js", () => ({
  default: {
    listen: listenMock,
  },
}));

vi.mock("../src/env.js", () => ({
  env: {
    PORT: 4000,
  },
}));

describe("server entrypoint", () => {
  beforeEach(() => {
    vi.resetModules();
    listenMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts the server and logs the listening message", async () => {
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    listenMock.mockImplementation((_port, callback) => {
      callback?.();
      return { on: vi.fn() };
    });

    await import("../src/index.js");

    expect(listenMock).toHaveBeenCalledWith(4000, expect.any(Function));
    expect(consoleLogSpy).toHaveBeenCalledWith("Listening: http://localhost:4000");
  });

  it("handles port already in use errors", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined);
    let capturedErrorHandler;

    listenMock.mockImplementation((_port, callback) => {
      callback?.();
      return {
        on: (event, handler) => {
          if (event === "error") {
            capturedErrorHandler = handler;
          }
        },
      };
    });

    await import("../src/index.js");

    expect(capturedErrorHandler).toBeTypeOf("function");

    capturedErrorHandler({ code: "EADDRINUSE" });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Port 4000 is already in use. Please choose another port or stop the process using it.",
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("handles unexpected server errors", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined);
    const error = new Error("boom");
    let capturedErrorHandler;

    listenMock.mockImplementation((_port, callback) => {
      callback?.();
      return {
        on: (event, handler) => {
          if (event === "error") {
            capturedErrorHandler = handler;
          }
        },
      };
    });

    await import("../src/index.js");

    expect(capturedErrorHandler).toBeTypeOf("function");

    capturedErrorHandler(error);

    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to start server:", error);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});

