# AGENTS.md

Guidance for coding agents working in this repository.

## Scope

- Repo purpose: containerized backend stack for Maps Search + Ollama + Open WebUI.
- Main app code to edit: `be-express/`.
- Backend stack: Node.js 20+, Express 5, ESM JavaScript, Vitest.

## Repository Layout

- `be-express/src/` - app bootstrap, env, middleware, routes, services.
- `be-express/test/` - unit/integration tests mirroring source domains.
- `be-express/eslint.config.mjs` - canonical style/lint rules.
- `be-express/package.json` - scripts and dependency entrypoint.
- `docker-compose.yml` - local multi-service orchestration.
- `README.md` - root-level setup and local stack runbook.

## Setup Commands

From repo root:

```bash
pnpm --dir be-express install
```

From `be-express/`:

```bash
pnpm install
```

## Build, Lint, and Test Commands

Root-invoked backend commands:

```bash
pnpm --dir be-express lint
pnpm --dir be-express test
pnpm --dir be-express test-coverage
pnpm --dir be-express dev
pnpm --dir be-express start
```

If already in `be-express/`:

```bash
pnpm lint
pnpm test
pnpm test-coverage
pnpm dev
pnpm start
```

Notes:

- No separate transpile/build script for app code.
- `lint` runs `eslint --fix src`.
- `test` runs `vitest run` (non-watch, CI-friendly).

## Single-Test Commands (Important)

Run one file:

```bash
pnpm --dir be-express test -- test/routes/map.test.js
```

Run one test by name pattern:

```bash
pnpm --dir be-express test -- -t "returns search results when query is valid"
```

Run single file with coverage:

```bash
pnpm --dir be-express test-coverage -- test/routes/map.test.js
```

Direct Vitest alternative:

```bash
pnpm --dir be-express vitest run test/routes/map.test.js
```

## Docker / Integration Commands

- Start full stack: `docker compose up --build`.
- Rebuild backend image only: `docker compose build maps-backend`.
- Backend health/OpenAPI endpoint: `http://localhost:3001/openapi.json`.

## Code Style and Formatting

Derived from `be-express/eslint.config.mjs` and existing code:

- Indentation: 2 spaces.
- Semicolons: required.
- Quotes: double quotes.
- Filenames: kebab-case (`unicorn/filename-case`).
- Keep imports sorted (`perfectionist/sort-imports`).
- Keep ESM syntax; avoid CommonJS (`require/module.exports`) in source.
- Use explicit `.js` extensions for internal imports.

## Import and Export Guidelines

- Third-party imports first, local imports second.
- Preserve stable import order to prevent lint churn.
- Use named exports for utilities and service helpers.
- Use default exports for main module objects where already established (`app`, routers).
- Keep barrel exports when present (`src/services/index.js`).

## Types, Validation, and Data Contracts

- Codebase is JavaScript-first; do runtime validation with Zod.
- Validate all external input at boundaries (env, query/body params, external responses).
- Prefer `env` from `src/env.js`; avoid direct `process.env` in feature code.
- If introducing TypeScript, prefer `type` aliases over `interface`.
- Use coercion for env numeric values (`z.coerce.number()`) when appropriate.

## Naming Conventions

- Files/directories: kebab-case.
- Variables/functions: camelCase.
- Constants/env keys: UPPER_SNAKE_CASE.
- Route modules: clear feature naming (`map.js`, `google-map.js`).
- Tests: `*.test.js`, located to mirror source structure.

## Error Handling Conventions

- Keep `notFound` and `errorHandler` middleware mounted last.
- Set HTTP status explicitly before returning JSON error payloads.
- Keep payload shape stable and simple (e.g., `{ error }` or `{ message, stack }`).
- Avoid leaking internal stack traces in production responses.
- Fail fast on invalid startup/config state (env parsing errors should terminate).
- Handle known operational startup failures (e.g., `EADDRINUSE`) explicitly.

## Logging Conventions

- `no-console` is warning-level: console is allowed but intentional.
- Keep logs concise and operationally useful.
- Keep `morgan("dev")` app-level request logging unless intentionally changing logging strategy.
- Never log secrets (API keys, raw env dumps, credentials).

## Route and Service Conventions

- Register feature routes centrally through `src/routes/index.js`.
- Keep route handlers thin: parse/validate input, call service, return response.
- Keep transport/API details inside service modules (`src/services/`).
- Return normalized service objects; handle empty/downstream edge cases defensively.
- Maintain OpenAPI annotations in route files when API behavior changes.

## Testing Conventions

- Use Vitest primitives: `describe`, `it`, `expect`, `vi`.
- Use Supertest for HTTP-level route/app assertions.
- Mock external network/service dependencies in tests.
- Reset/restore mocks in `beforeEach` / `afterEach` to prevent test bleed.
- Prefer deterministic assertions (status codes, payload fields, key error messages).

## Agent Workflow

- Inspect nearby code before editing; follow local patterns first.
- Keep changes minimal, safe, and scoped to the request.
- Run lint + relevant tests for touched areas (at minimum changed test files).
- For route/service changes, run corresponding route tests and one app-level smoke test.
- If behavior changes, update related docs/OpenAPI annotations.

## Environment and Secrets

- Required for map lookup behavior: `GOOGLE_MAPS_API_KEY`.
- Use `.env.sample` as template; never commit real secrets.
- Keep env defaults aligned with `src/env.js` and `docker-compose.yml`.

## Quick Pre-PR Checklist

- `pnpm --dir be-express lint` passes.
- `pnpm --dir be-express test` passes.
- Changed tests pass in isolation (single-file run).
- No accidental secret exposure.
- API docs/OpenAPI comments updated if endpoint behavior changed.
