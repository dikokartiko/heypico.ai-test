# Maps Backend (Express)

Backend service for place search + direction links used by Open WebUI tool calling.

## What it does

- Exposes `GET /api/maps/search` for Google Maps Places text search.
- Returns normalized places with:
  - `maps_url` (open place in Google Maps)
  - `directions_url` (open route to destination)
  - `embed_url` (optional iframe URL when browser embed key is configured)
- Serves OpenAPI JSON at `/openapi.json` and Swagger UI at `/api-docs`.

## Environment variables

Required (outside test env):

- `GOOGLE_MAPS_API_KEY`: server-side key used for Places API calls.

Optional:

- `GOOGLE_MAPS_EMBED_API_KEY`: browser-restricted key for embed URLs.
- `PORT` (default `3000`)
- `RATE_LIMIT_WINDOW_MS` (default `90000`)
- `RATE_LIMIT_MAX_REQUESTS` (default `100`)
- `MAPS_RATE_LIMIT_WINDOW_MS` (default `60000`)
- `MAPS_RATE_LIMIT_MAX_REQUESTS` (default `30`)
- `CORS_ALLOWED_ORIGINS` (default `http://localhost:3000`, comma-separated)
- `GOOGLE_MAPS_TIMEOUT_MS` (default `8000`)

Use `.env.sample` as a reference.

## Security notes

- Keep `GOOGLE_MAPS_API_KEY` server-only. It is never returned in API payloads.
- If you enable embeds, restrict `GOOGLE_MAPS_EMBED_API_KEY` by HTTP referrer.
- Configure Google quota alerts and caps to control API usage cost.
- CORS and rate limiting are enabled by default.

## Development

Install dependencies:

```bash
pnpm install
```

Run locally:

```bash
pnpm dev
```

Run tests:

```bash
pnpm test
```

Run lint:

```bash
pnpm lint
```
