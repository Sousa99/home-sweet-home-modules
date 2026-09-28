# fly-over-tracker — Setup

Aircraft tracking over any GPS location, delivered as a dual-mode backend (REST + MCP) and a
frontend SPA with a Storybook workbench. The module lives in the Home Sweet Home modules monorepo
at `modules/fly-over-tracker/`.

## 🧰 Prerequisites

- Node 24 and pnpm 11 (repository-wide toolchain)
- Docker (optional) for the Docker Compose environment

## 📦 Install

From the repository root:

```bash
pnpm install
```

The module is **stateless** — there is no database to create or migrate. All runtime configuration
is optional and environment-driven; no credentials are required.

## 🏃 Run

From the repository root.

### Backend — REST API

```bash
pnpm --filter ./modules/fly-over-tracker/backend dev    # tsx watch, --http
```

Serves the REST API on `http://localhost:3000` (`PORT`; `HTTP_PORT` is a backward-compatible
alias and wins when both are set):

| Endpoint | Description |
|----------|-------------|
| `GET /api/fly-overs?lat=&lng=&radiusKm=` | Aircraft currently over a GPS point and radius (max `MAX_RADIUS_KM`, default `463`) |

### Backend — MCP server

```bash
pnpm --filter ./modules/fly-over-tracker/backend dev:mcp    # tsx watch, --mcp
```

Serves the MCP server over streamable HTTP at `http://localhost:3001/mcp` (`MCP_PORT`). Tool:
`planes_over` (`lat`, `lng`, `radiusKm`) — the same service and zod schema as the REST endpoint.

### Frontend — SPA

```bash
pnpm --filter ./modules/fly-over-tracker/frontend dev
```

Open the printed URL (default `http://localhost:5173`). The Vite dev server proxies `/api` to
`http://localhost:3000`. The SPA reads `API_BASE_URL` at runtime from `/config.json`
(`src/api/baseUrl.ts`); empty means same-origin `/api`.

### Frontend — Storybook workbench

```bash
pnpm --filter ./modules/fly-over-tracker/frontend storybook
```

Open the printed URL (default `http://localhost:6006`). Browse the `FlyOverWidget` and
`ClosestAircraftCard` previews and their `.mdx` docs pages.

### Docker Compose

```bash
docker compose --profile rest+spa up -d        # REST (:3101) + SPA (:3301)
docker compose --profile rest+storybook up -d  # REST (:3101) + Storybook (:3401)
docker compose --profile mcp up -d             # MCP (:3201)
docker compose --profile backend up -d         # REST + MCP backends only
docker compose --profile full up -d            # everything
```

Host ports are fixed per `specs/004-local-setup-standardization/contracts/ports.md` and overridable
via `.env` (`HSH_FLY_OVER_TRACKER_REST_PORT`, `HSH_FLY_OVER_TRACKER_MCP_PORT`,
`HSH_FLY_OVER_TRACKER_SPA_PORT`, `HSH_FLY_OVER_TRACKER_STORYBOOK_PORT`). The Compose stack shares
the repo-root `data/` directory convention used by the DB-backed modules; fly-over-tracker itself
persists nothing.

## 🔒 Quality Gates

```bash
pnpm --filter ./modules/fly-over-tracker/backend test        # Vitest suite (REST + MCP contracts)
pnpm --filter ./modules/fly-over-tracker/backend typecheck   # tsc --noEmit
pnpm --filter ./modules/fly-over-tracker/frontend test       # Vitest suite
pnpm --filter ./modules/fly-over-tracker/frontend typecheck  # tsc --noEmit
pnpm --filter ./modules/fly-over-tracker/frontend build      # SPA build -> dist-app/
pnpm --filter ./modules/fly-over-tracker/frontend build:lib  # library build -> dist-lib/ (publishable)
pnpm --filter ./modules/fly-over-tracker/frontend build-storybook # static workbench -> dist-storybook/
```

The repository-wide `pnpm lint`, `pnpm format`, `pnpm typecheck`, and `pnpm test` also cover
this module via the shared workspace scripts.

## ✅ Manual Validation

1. Start the backend (`pnpm --filter ./modules/fly-over-tracker/backend dev`) and query
   `http://localhost:3000/api/fly-overs?lat=38.7223&lng=-9.1393&radiusKm=10` — it returns JSON
   with `count`, `aircraft` sorted by `distanceKm` ascending, and `destinationEnrichment`.
2. Ask for an out-of-range radius (`radiusKm=500`) — the API rejects it with a `400` validation
   error (`MAX_RADIUS_KM` = 463).
3. Start the MCP server (`pnpm --filter ./modules/fly-over-tracker/backend dev:mcp`) — it listens
   on `http://localhost:3001/mcp`; the `planes_over` tool returns the same payload shape as the
   REST endpoint.
4. Run the SPA and submit a query — the aircraft list appears; toggle to the map view, where
   markers render over the Leaflet map.
5. Set a refresh rate — the results update at the chosen cadence; the "Updating…" indicator
   appears while a refresh is in flight.
6. With aircraft in range, embed `ClosestAircraftCard` (or use the workbench preview) — it shows
   the single nearest aircraft and animates when the closest one changes.
7. Stop the backend while the SPA is open and refresh — the SPA shows a clear error state instead
   of crashing (graceful degradation).
8. Run the backend with `FEED=mock` — it serves deterministic offline data, so the module is fully
   exercisable without the live feed.
9. In the workbench, embed `FlyOverWidget` and `ClosestAircraftCard` and cycle the previews
   (with aircraft / empty / error).
10. Run `docker compose --profile full up -d` — the SPA at `:3301` proxies `/api` to the REST
    backend at `:3101` and shows the same dashboard.

## 🗂️ Project Layout

```text
backend/
├── src/
│   ├── index.ts                 dual-mode entry (--http / --mcp), PORT, HTTP_PORT, MCP_PORT, HOST
│   ├── http/                    Hono REST app (app.ts) + routes (routes.ts: GET /api/fly-overs)
│   ├── mcp/                     MCP server (streamable HTTP at /mcp) + planes_over tool
│   ├── services/                flyOverService (shared query pipeline + route enrichment)
│   ├── feeds/                   adsbLol, adsbRoutes, mock, mockRoutes feed adapters
│   ├── domain/                  schemas (shared LocationQuerySchema) + types
│   └── lib/                     config, retry, destinationCache, airports, countries, errors, logger
├── tests/ (under src/)          Vitest contract + unit suites
└── .env.example                 optional local overrides (existing env vars win)
frontend/
├── src/
│   ├── App.tsx                  the SPA dashboard (form, list/map toggle, refresh-rate control)
│   ├── components/              FlyOverWidget, ClosestAircraftCard (published), FlyOverForm,
│   │                            FlyOverList, FlyOverMap, AircraftCard, AircraftMapCard,
│   │                            RefreshRateSelect, ViewModeToggle, ui/, *.mdx + *.stories.tsx
│   ├── api/                     client (getFlyOvers), types, baseUrl (runtime /config.json)
│   ├── hooks/                   useFlyOversQuery
│   ├── lib/                     aircraftIcon, leaflet, location, utils
│   ├── test/                    test setup + mocks (geolocation, react-leaflet)
│   └── index.ts                 library entry (published surface)
├── .storybook/                  Storybook config (addon-docs, Tailwind)
├── vite.config.ts               app build (dist-app)
└── vite.lib.config.ts           library build (dist-lib)
Dockerfile.backend / Dockerfile.frontend / Dockerfile.storybook
deploy/                          nginx confs + templates + entrypoint scripts
docs/                            module guides (configuration.md, clarify.md)
```

## 🔧 Troubleshooting

- **Port already in use**: Vite picks the next free port automatically; use the printed URL. For
  the backend, set `PORT` / `MCP_PORT` explicitly (or `HTTP_PORT`, which wins when both are set).
- **SPA shows network errors / no data**: make sure the backend is running on `:3000` (dev) or the
  `fly-over-tracker-backend` service is healthy (Compose); the SPA proxies `/api` to it.
- **Feed unavailable (`503` after retries)**: the module retries upstream `429`s with bounded
  backoff and then surfaces a clear error. Use `FEED=mock` for deterministic offline development,
  or check `ADSB_BASE_URL` / `ADSB_ROUTE_BASE_URL` if you point at a mirror.
- **Backend fails to start on an invalid value**: configuration is validated at startup (zod) —
  non-numeric ports or an unknown `FEED` fail fast; see [docs/configuration.md](docs/configuration.md).
- **Typecheck/lint failures**: run `pnpm format:write` then the module typecheck.

## 📦 Versioning & Releases

The module releases **independently** via changesets: `@sousa99/fly-over-tracker-backend` and
`@sousa99/fly-over-tracker-components` share one version (fixed group) and start at `0.0.1`. A
release publishes the components package to GitHub Packages and the backend/frontend container
images to GHCR, plus a GitHub release. See the repository root `AGENTS.md` for the release
workflow.