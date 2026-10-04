# weather-psychic — Setup

What's the weather now and what's coming, delivered as a dual-mode backend (REST + MCP) and a
frontend SPA with a Storybook workbench. The module lives in the Home Sweet Home modules monorepo
at `modules/weather-psychic/`.

## 🧰 Prerequisites

- Node 24 and pnpm 11 (repository-wide toolchain)
- Docker (optional) for the Docker Compose environment

## 📦 Install

From the repository root:

```bash
pnpm install
```

The module is **stateless** — there is no database to create or migrate. Runtime configuration is
environment-driven; no credentials are required. The weather provider (Open-Meteo) is free and
keyless; `FEED=mock` runs the deterministic offline feed.

## 🏃 Run

From the repository root.

### Backend — REST API

```bash
pnpm --filter ./modules/weather-psychic/backend dev    # tsx watch, --http
```

Serves the REST API on `http://localhost:3000` (`PORT`):

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Liveness check (`{ ok: true, service: 'weather-psychic' }`) |
| `GET /api/weather?lat=&lng=` | Current + hourly + daily forecast for a coordinate |
| `GET /api/locations/search?query=` | Location (geocoding) search |

### Backend — MCP server

```bash
pnpm --filter ./modules/weather-psychic/backend dev:mcp    # tsx watch, --mcp
```

Serves the MCP server over streamable HTTP at `http://localhost:3001/mcp` (`MCP_PORT`). Tools:
`weather.get_forecast` (`lat`, `lng`) and `weather.search` (`query`) — the same service and zod
schemas as the REST endpoints.

### Frontend — SPA

```bash
pnpm --filter ./modules/weather-psychic/frontend dev
```

Open the printed URL (default `http://localhost:5173`). The Vite dev server proxies `/api` to
`http://localhost:3000`. The SPA reads `API_BASE_URL` at runtime from `/config.json`
(`src/api/baseUrl.ts`); empty means same-origin `/api`.

### Frontend — Storybook workbench

```bash
pnpm --filter ./modules/weather-psychic/frontend storybook
```

Open `http://localhost:6006` to preview `Weather/CurrentWeatherCard`,
`Weather/DailyForecastCard`, `Weather/LocationSelector`, and the written `Weather/Documentation`
page.

## 🧪 Quality Gates

```bash
pnpm --filter @sousa99/weather-psychic-backend test
pnpm --filter @sousa99/weather-psychic-components test
pnpm typecheck
pnpm lint
pnpm format
```

## 👀 Manual Validation

With `FEED=mock`:

```bash
FEED=mock pnpm --filter ./modules/weather-psychic/backend dev
curl 'http://localhost:3000/api/health'
curl 'http://localhost:3000/api/weather?lat=38.7167&lng=-9.1333'
curl 'http://localhost:3000/api/locations/search?query=lisbon'
```

Each returns a JSON response (the weather payload's `hourly` starts at the next hour, the `daily`
list starts tomorrow). Run the SPA alongside the backend and pick a city to see both widgets
update.

## 🗂 Project Layout

```text
backend/    @sousa99/weather-psychic-backend    — dual-mode package: REST (--http) + MCP (--mcp)
frontend/   @sousa99/weather-psychic-components — one package: SPA, Storybook, components library
Dockerfile.backend / Dockerfile.frontend / Dockerfile.storybook — build inputs for the GHCR images
deploy/     deployment manifests (nginx confs + entrypoint scripts)
```

## 🐛 Troubleshooting

- **"Provider returned no current conditions"** — the provider response lacked a `current` block;
  retry, or use `FEED=mock` to run offline.
- **The SPA shows stale data / a failure notice** — the backend is unreachable at the resolved
  base URL; check the backend is running and `API_BASE_URL` (if set) points at it.
- **Ports already in use** — override with `PORT` / `MCP_PORT` env vars, or adjust the Compose
  host mappings in the repo-root `docker-compose.yml` (host ports `3104` REST / `3204` MCP / `3304`
  SPA / `3404` Storybook).

## 🔖 Versioning

The two packages are a changesets **fixed group** and version together from `0.0.1`, independently
of the other modules. See `.changeset/config.json`.