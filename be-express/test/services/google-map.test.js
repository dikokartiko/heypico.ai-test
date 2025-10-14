import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

vi.mock("node-fetch", () => ({
  default: fetchMock,
}));

const ORIGINAL_ENV = process.env;

describe("searchPlace", () => {
  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockReset();
    process.env = { ...ORIGINAL_ENV, GOOGLE_MAPS_API_KEY: "test-key" };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    vi.restoreAllMocks();
  });

  it("returns formatted result when Google provides data", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({
        results: [
          {
            name: "Central Park",
            formatted_address: "New York, NY",
            geometry: { location: { lat: 40.785091, lng: -73.968285 } },
          },
        ],
      }),
    });

    const { searchPlace } = await import("../../src/services/google-map.js");
    const result = await searchPlace("Central Park");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://maps.googleapis.com/maps/api/place/textsearch/json?query=Central+Park&key=test-key",
    );
    expect(result).toMatchObject({
      name: "Central Park",
      address: "New York, NY",
      map_link: "https://www.google.com/maps?q=40.785091,-73.968285",
    });
    expect(result.embed_html).toContain("Central%20Park");
    expect(result.embed_html).toContain("test-key");
  });

  it("returns an error object when no results are found", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({
        results: [],
      }),
    });

    const { searchPlace } = await import("../../src/services/google-map.js");
    const result = await searchPlace("Unknown Place");

    expect(result).toEqual({ error: "No results found." });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

