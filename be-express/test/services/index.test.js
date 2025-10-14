import { describe, expect, it } from "vitest";

describe("services index export", () => {
  it("re-exports searchPlace from google-map service", async () => {
    const { searchPlace: reExported } = await import("../../src/services/index.js");
    const { searchPlace } = await import("../../src/services/google-map.js");

    expect(reExported).toBe(searchPlace);
  });
});

