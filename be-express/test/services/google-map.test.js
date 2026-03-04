import { beforeEach, describe, expect, it, vi } from "vitest";

const { envMock, fetchMock } = vi.hoisted(() => ({
  envMock: {
    GOOGLE_MAPS_API_KEY: "server-key",
    GOOGLE_MAPS_EMBED_API_KEY: "embed-key",
    GOOGLE_MAPS_TIMEOUT_MS: 8000,
  },
  fetchMock: vi.fn(),
}));

vi.mock("node-fetch", () => ({
  default: fetchMock,
}));

vi.mock("../../src/env.js", () => ({
  env: envMock,
}));

import { searchPlace } from "../../src/services/google-map.js";

describe("searchPlace", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    envMock.GOOGLE_MAPS_EMBED_API_KEY = "embed-key";
  });

  it("returns normalized place results with map URLs", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({
        results: [
          {
            formatted_address: "New York, NY",
            geometry: { location: { lat: 40.785091, lng: -73.968285 } },
            name: "Central Park",
            place_id: "central-park",
          },
        ],
        status: "OK",
      }),
      ok: true,
    });

    const result = await searchPlace("Central Park", {
      limit: 1,
      origin: "Times Square",
      travelMode: "walking",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://maps.googleapis.com/maps/api/place/textsearch/json?key=server-key&query=Central+Park",
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );

    expect(result).toMatchObject({
      query: "Central Park",
      total: 1,
    });

    expect(result.results[0]).toMatchObject({
      address: "New York, NY",
      location: {
        lat: 40.785091,
        lng: -73.968285,
      },
      name: "Central Park",
      place_id: "central-park",
    });

    expect(result.results[0].maps_url).toContain("query_place_id=central-park");
    expect(result.results[0].directions_url).toContain("origin=Times+Square");
    expect(result.results[0].directions_url).toContain("travelmode=walking");
    expect(result.results[0].embed_url).toContain("key=embed-key");
    expect(result.results[0].embed_url).not.toContain("server-key");
  });

  it("returns empty result sets for ZERO_RESULTS", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({
        results: [],
        status: "ZERO_RESULTS",
      }),
      ok: true,
    });

    const result = await searchPlace("Unknown Place");

    expect(result).toEqual({
      query: "Unknown Place",
      results: [],
      total: 0,
    });
  });

  it("throws a service error when Google quota is exceeded", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({
        error_message: "You have exceeded your daily request quota",
        status: "OVER_QUERY_LIMIT",
      }),
      ok: true,
    });

    await expect(searchPlace("Busy Place")).rejects.toMatchObject({
      message: expect.stringContaining("quota"),
      name: "GoogleMapsServiceError",
      statusCode: 429,
    });
  });

  it("throws a service error when upstream HTTP response fails", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
    });

    await expect(searchPlace("Central Park")).rejects.toMatchObject({
      name: "GoogleMapsServiceError",
      statusCode: 502,
    });
  });

  it("omits embed URL when browser key is not configured", async () => {
    envMock.GOOGLE_MAPS_EMBED_API_KEY = undefined;
    fetchMock.mockResolvedValue({
      json: async () => ({
        results: [
          {
            formatted_address: "New York, NY",
            geometry: { location: { lat: 40.785091, lng: -73.968285 } },
            name: "Central Park",
            place_id: "central-park",
          },
        ],
        status: "OK",
      }),
      ok: true,
    });

    const result = await searchPlace("Central Park", { limit: 1 });

    expect(result.results[0].embed_url).toBeNull();
  });
});
