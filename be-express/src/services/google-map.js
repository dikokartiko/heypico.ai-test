import fetch from "node-fetch";

/* eslint-disable node/no-process-env */
const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY;
/* eslint-enable node/no-process-env */

export async function searchPlace(query) {
  const baseUrl = "https://maps.googleapis.com/maps/api/place/textsearch/json";
  const params = new URLSearchParams({ query, key: GOOGLE_KEY });

  const res = await fetch(`${baseUrl}?${params.toString()}`);
  const data = await res.json();

  if (!data.results?.length) {
    return { error: "No results found." };
  }

  const place = data.results[0];
  const { name, formatted_address, geometry } = place;
  const { lat, lng } = geometry.location;

  return {
    name,
    address: formatted_address,
    map_link: `https://www.google.com/maps?q=${lat},${lng}`,
    embed_html: `<iframe width="600" height="450" style="border:0" loading="lazy" allowfullscreen src="https://www.google.com/maps/embed/v1/place?q=${encodeURIComponent(
      name,
    )}&key=${GOOGLE_KEY}"></iframe>`,
  };
}
