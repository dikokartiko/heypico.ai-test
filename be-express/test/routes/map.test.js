import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { searchPlaceMock } = vi.hoisted(() => ({
  searchPlaceMock: vi.fn(),
}));

vi.mock("../../src/services/google-map.js", () => {
  class GoogleMapsServiceError extends Error {
    constructor(message, statusCode = 502) {
      super(message);
      this.statusCode = statusCode;
    }
  }

  return {
    GoogleMapsServiceError,
    searchPlace: searchPlaceMock,
  };
});

import app from "../../src/app.js";

const mockResult = {
  query: "coffee shop",
  results: [
    {
      address: "123 Bean St",
      directions_url: "https://www.google.com/maps/dir/?api=1&destination=0,0",
      embed_url: "https://www.google.com/maps/embed/v1/place?key=embed-key&q=Coffee+Shop",
      location: {
        lat: 0,
        lng: 0,
      },
      maps_url: "https://www.google.com/maps/search/?api=1&query=0,0",
      name: "Coffee Shop",
      place_id: "place-1",
    },
  ],
  total: 1,
};

describe("GET /api/maps/search", () => {
  beforeEach(() => {
    searchPlaceMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns search results when query is valid", async () => {
    searchPlaceMock.mockResolvedValue(mockResult);

    const response = await request(app)
      .get("/api/maps/search")
      .query({
        limit: 2,
        origin: "Monas Jakarta",
        q: "coffee shop",
        travel_mode: "walking",
      })
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual(mockResult);
    expect(searchPlaceMock).toHaveBeenCalledWith("coffee shop", {
      limit: 2,
      origin: "Monas Jakarta",
      travelMode: "walking",
    });
  });

  it("rejects queries shorter than minimum length", async () => {
    const response = await request(app)
      .get("/api/maps/search")
      .query({ q: "a" })
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body.error).toContain("at least 2");
    expect(searchPlaceMock).not.toHaveBeenCalled();
  });

  it("rejects limit values outside allowed range", async () => {
    const response = await request(app)
      .get("/api/maps/search")
      .query({
        limit: 99,
        q: "coffee shop",
      })
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body.error).toContain("less than or equal");
    expect(searchPlaceMock).not.toHaveBeenCalled();
  });

  it("maps downstream service errors to their status code", async () => {
    const quotaError = new Error("Quota exceeded");
    quotaError.statusCode = 429;
    searchPlaceMock.mockRejectedValue(quotaError);

    const response = await request(app)
      .get("/api/maps/search")
      .query({ q: "coffee shop" })
      .expect("Content-Type", /json/)
      .expect(429);

    expect(response.body.error).toBe("Quota exceeded");
  });
});
