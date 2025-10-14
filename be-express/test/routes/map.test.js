import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/services/google-map.js", () => ({
  searchPlace: vi.fn(),
}));

import app from "../../src/app.js";
import { searchPlace } from "../../src/services/google-map.js";

const mockResult = {
  name: "Coffee Shop",
  address: "123 Bean St",
  map_link: "https://www.google.com/maps?q=0,0",
  embed_html: "<iframe></iframe>",
};

describe("GET /api/maps/search", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    searchPlace.mockReset();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.clearAllMocks();
  });

  it("returns search results when query is valid", async () => {
    searchPlace.mockResolvedValue(mockResult);

    const response = await request(app)
      .get("/api/maps/search")
      .query({ q: "coffee shop" })
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual(mockResult);
    expect(searchPlace).toHaveBeenCalledWith("coffee shop");
  });

  it("rejects queries shorter than minimum length", async () => {
    const response = await request(app)
      .get("/api/maps/search")
      .query({ q: "a" })
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body.error).toContain("query required");
    expect(searchPlace).not.toHaveBeenCalled();
  });

  it("handles downstream service errors", async () => {
    searchPlace.mockRejectedValue(new Error("Service failure"));

    const response = await request(app)
      .get("/api/maps/search")
      .query({ q: "coffee shop" })
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body.error).toBe("Service failure");
  });
});
