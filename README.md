# heypico.ai-test

## Overview

This workspace ships a containerized Express backend (`maps-backend`) plus the supporting Ollama and Open WebUI services defined in `docker-compose.yml`. The backend lives in `be-express` and exposes an OpenAPI spec consumed by Open WebUI.

## Prerequisites

- Docker Engine and Docker Compose plugin
- (Optional) Node.js 20+ if you want to run or test the backend outside of Docker
- A Google Maps API key for the backend search functionality

## Configuration

Create a `.env` file at the repository root (next to `docker-compose.yml`) and add any secrets you need. Only `GOOGLE_MAPS_API_KEY` is required for the backend to perform map lookups; the others fall back to sane defaults:

```env
GOOGLE_MAPS_API_KEY=your_api_key_here
# Optional overrides:
# RATE_LIMIT_WINDOW_MS=90000
# RATE_LIMIT_MAX_REQUESTS=100
# PORT=3001
```

## Run the stack

```bash
docker compose up --build
```

The first run builds the backend image, installs dependencies, and starts the containers. The key ports:

- Backend API: http://localhost:3001 (Swagger UI at `/api-docs`, OpenAPI at `/openapi.json`)
- Open WebUI: http://localhost:3000
- Ollama: http://localhost:11434

Compose is configured with health checks so dependent services wait for the backend before starting.

### Download an Ollama model

After the containers are healthy, pull a model into the running Ollama service. Example:

```bash
docker exec -it ollama ollama pull phi4-mini:3.8b
```

Swap the model name as needed for your workload.

### Enable the Maps Search tool in Open WebUI

1. After the stack is up, open Open WebUI (`http://localhost:3000`) and toggle on the **Maps Search** tool from the tools menu below the chat box.
2. Go to **User → Settings → System Prompt**, and add:
   ```
   You are HeyPico.AI. User's current location is {{USER_LOCATION}}.
   When user asks about nearby places, use the maps-search tool with their location context.
   ```
3. Open the **Interface** tab and enable:
   - `Allow User Location`
   - `iframe Sandbox Allow Same Origin`
   - `iframe Sandbox Allow Forms`

## Developing locally

- Run backend tests: `pnpm --dir be-express test`
- Lint backend: `pnpm --dir be-express lint`
- Start backend in watch mode (requires local `.env` inside `be-express`): `pnpm --dir be-express dev`

## Troubleshooting

- If the backend container exits with `node: .env: not found`, ensure you are not mounting a host `.env` into `/app`—the container now relies on environment variables passed in via Compose.
- To rebuild after dependency changes: `docker compose build maps-backend`.
