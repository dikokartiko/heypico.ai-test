import fetch from "node-fetch";

import { env } from "../env.js";

const GOOGLE_MAPS_DIRECTIONS_URL = "https://www.google.com/maps/dir/";
const GOOGLE_MAPS_EMBED_URL = "https://www.google.com/maps/embed/v1/place";
const GOOGLE_MAPS_PLACE_URL = "https://www.google.com/maps/search/";
const GOOGLE_MAPS_TEXT_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json";

const GOOGLE_STATUS_ERROR_MAP = {
  INVALID_REQUEST: {
    message: "Google Maps request is invalid.",
    statusCode: 400,
  },
  OVER_DAILY_LIMIT: {
    message: "Google Maps daily usage limit has been reached.",
    statusCode: 429,
  },
  OVER_QUERY_LIMIT: {
    message: "Google Maps query quota has been exceeded.",
    statusCode: 429,
  },
  REQUEST_DENIED: {
    message: "Google Maps request was denied.",
    statusCode: 502,
  },
  UNKNOWN_ERROR: {
    message: "Google Maps returned an unknown error.",
    statusCode: 502,
  },
};

export class GoogleMapsServiceError extends Error {
  constructor(message, statusCode = 502) {
    super(message);
    this.name = "GoogleMapsServiceError";
    this.statusCode = statusCode;
  }
}

function buildPlaceUrl({ lat, lng, name, placeId }) {
  const params = new URLSearchParams({ api: "1" });

  if (lat != null && lng != null) {
    params.set("query", `${lat},${lng}`);
  }
  else {
    params.set("query", name);
  }

  if (placeId) {
    params.set("query_place_id", placeId);
  }

  return `${GOOGLE_MAPS_PLACE_URL}?${params.toString()}`;
}

function buildDirectionsUrl({ lat, lng, origin, placeId, travelMode }) {
  if (!placeId && (lat == null || lng == null)) {
    return null;
  }

  const params = new URLSearchParams({
    api: "1",
    travelmode: travelMode,
  });

  if (lat != null && lng != null) {
    params.set("destination", `${lat},${lng}`);
  }

  if (placeId) {
    params.set("destination_place_id", placeId);
  }

  if (origin) {
    params.set("origin", origin);
  }

  return `${GOOGLE_MAPS_DIRECTIONS_URL}?${params.toString()}`;
}

function buildEmbedUrl({ name, placeId }) {
  if (!env.GOOGLE_MAPS_EMBED_API_KEY) {
    return null;
  }

  const params = new URLSearchParams({
    key: env.GOOGLE_MAPS_EMBED_API_KEY,
    q: placeId ? `place_id:${placeId}` : name,
  });

  return `${GOOGLE_MAPS_EMBED_URL}?${params.toString()}`;
}

function mapGoogleStatusToError(status, errorMessage) {
  const mappedError = GOOGLE_STATUS_ERROR_MAP[status] ?? {
    message: `Google Maps returned status ${status}.`,
    statusCode: 502,
  };
  const message = errorMessage
    ? `${mappedError.message} ${errorMessage}`
    : mappedError.message;

  return new GoogleMapsServiceError(message, mappedError.statusCode);
}

function normalizePlace(place, options) {
  const { origin, travelMode } = options;
  const { formatted_address: address, name, place_id: placeId } = place;
  const lat = place.geometry?.location?.lat ?? null;
  const lng = place.geometry?.location?.lng ?? null;

  return {
    address,
    directions_url: buildDirectionsUrl({
      lat,
      lng,
      origin,
      placeId,
      travelMode,
    }),
    embed_url: buildEmbedUrl({ name, placeId }),
    location: {
      lat,
      lng,
    },
    maps_url: buildPlaceUrl({ lat, lng, name, placeId }),
    name,
    place_id: placeId,
  };
}

async function fetchGooglePlaces(query) {
  const params = new URLSearchParams({
    key: env.GOOGLE_MAPS_API_KEY,
    query,
  });
  const requestUrl = `${GOOGLE_MAPS_TEXT_SEARCH_URL}?${params.toString()}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), env.GOOGLE_MAPS_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(requestUrl, {
      signal: controller.signal,
    });
  }
  catch (error) {
    if (error.name === "AbortError") {
      throw new GoogleMapsServiceError("Google Maps request timed out.", 504);
    }

    throw new GoogleMapsServiceError("Unable to reach Google Maps service.", 502);
  }
  finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new GoogleMapsServiceError(
      `Google Maps HTTP error: ${response.status}.`,
      502,
    );
  }

  let data;
  try {
    data = await response.json();
  }
  catch {
    throw new GoogleMapsServiceError("Google Maps returned invalid JSON.", 502);
  }

  return data;
}

export async function searchPlace(query, options = {}) {
  const { limit = 3, origin, travelMode = "driving" } = options;
  const payload = await fetchGooglePlaces(query);

  if (payload.status === "ZERO_RESULTS") {
    return {
      query,
      results: [],
      total: 0,
    };
  }

  if (payload.status !== "OK") {
    throw mapGoogleStatusToError(payload.status, payload.error_message);
  }

  if (!payload.results?.length) {
    return {
      query,
      results: [],
      total: 0,
    };
  }

  const results = payload.results
    .slice(0, limit)
    .map(place => normalizePlace(place, { origin, travelMode }));

  return {
    query,
    results,
    total: results.length,
  };
}
