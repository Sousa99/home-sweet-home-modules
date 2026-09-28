# bus-catcher — Setup

Bus arrival tracking for Lisbon's **Carris Metropolitana**, delivered as a dual-mode backend
(REST + MCP) and a frontend SPA with a Storybook workbench. The module lives in the Home Sweet
Home modules monorepo at `modules/bus-catcher/`.

## 🧰 Prerequisites

- Node 24 and pnpm 11 (repository-wide toolchain)
- Docker (optional) for the Docker Compose environment

## 📦 Install

From the repository root:

```bash
pnpm install
```

The SQLite database is created lazily on first run. Native runs default to the repo-root common
data directory: `DB_PATH` defaults to `../../data/bus-catcher.db` (resolved from the backend
package directory), the same location the Docker Compose stack uses.

## 🏃 Run

From the repository root.

### Backend — REST API

```bash
pnpm --filter ./modules/bus-catcher/backend dev    # tsx watch, --http
```

Serves the REST API on `http://localhost:3000` (`PORT`):

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET /api/lines` | List lines |
| `GET /api/stops?q=&limit=` | Search/list stops |
| `GET /api/stops/:id` | Stop details |
| `GET /api/stops/:id/times?limit=&line=` | Next arrivals (schedule + live) |
| `GET /api/status` | Feed status (last refresh, staleness) |
| `POST /api/refresh` | Trigger a feed refresh |
| `GET /api/config` | Personal stop list + thresholds |
| `POST /api/config/stops` · `PUT /api/config/stops/:id` · `DELETE /api/config/stops/:id` | Manage the personal stop list |

### Backend — MCP server

```bash
pnpm --filter ./modules/bus-catcher/backend dev:mcp    # tsx watch, --mcp
```

Serves the MCP server over streamable HTTP at `http://localhost:3001/mcp` (`MCP_PORT`). Tools:
`list_lines`, `search_stops`, `get_stop`, `get_stop_times`, `get_status`, `refresh_schedule`,
`get_config`, `add_stop`, `update_stop`, `remove_stop`.

### Frontend — SPA

```bash
pnpm --filter ./modules/bus-catcher/frontend dev
```

Open the printed URL (default `http://localhost:5173`). The Vite dev server proxies `/api` to
`http://localhost:3000`. The SPA reads `API_BASE_URL` at runtime from `/config.json`
(`src/api/baseUrl.ts`); empty means same-origin `/api`.

### Frontend — Storybook workbench

```bash
pnpm --filter ./modules/bus-catcher/frontend storybook
```

Open the printed URL (default `http://localhost:6006`). Browse the `StopCard` previews
(urgency levels, schedule-only, empty, loading, error, missing) and the `StopCard.mdx` docs page.

### Docker Compose

```bash
docker compose --profile rest+spa up -d        # REST (:3100) + SPA (:3300)
docker compose --profile rest+storybook up -d  # REST (:3100) + Storybook (:3400)
docker compose --profile mcp up -d             # MCP (:3200)
docker compose --profile full up -d            # everything
```

Host ports are fixed per `specs/004-local-setup-standardization/contracts/ports.md` and overridable
via `.env` (`HSH_BUS_CATCHER_REST_PORT`, `HSH_BUS_CATCHER_MCP_PORT`, `HSH_BUS_CATCHER_SPA_PORT`,
`HSH_BUS_CATCHER_STORYBOOK_PORT`). Databases live in the shared repo-root `data/` directory.

## 🔒 Quality Gates

```bash
pnpm --filter ./modules/bus-catcher/backend test        # Vitest suite
pnpm --filter ./modules/bus-catcher/backend typecheck   # tsc --noEmit
pnpm --filter ./modules/bus-catcher/frontend test       # Vitest suite
pnpm --filter ./modules/bus-catcher/frontend typecheck  # tsc --noEmit
pnpm --filter ./modules/bus-catcher/frontend build      # SPA build -> dist-app/
pnpm --filter ./modules/bus-catcher/frontend build:lib  # library build -> dist-lib/ (publishable)
pnpm --filter ./modules/bus-catcher/frontend build-storybook # static workbench -> dist-storybook/
```

The repository-wide `pnpm lint`, `pnpm format`, `pnpm typecheck`, and `pnpm test` also cover
this module via the shared workspace scripts.

## ✅ Manual Validation

1. Start the backend (`pnpm --filter ./modules/bus-catcher/backend dev`) and hit
   `http://localhost:3000/api/health` — it returns `{"ok":true,...}`.
2. With the SPA running, search for a stop by name — matches appear with their serving lines.
3. Add a stop to the config list — it appears on the Dashboard as a `StopCard` with next arrivals.
4. Edit a configured stop and set departure thresholds — the urgency dots in the arrivals list
   change accordingly (defaults `10 / 5 / 1` minutes).
5. Trigger a schedule refresh (Refresh button or `POST /api/refresh`) — the status banner shows
   the feed becoming fresh again.
6. Stop the realtime feed — the SPA keeps showing scheduled times and flags that live ETA is
   unavailable (schedule-only fallback).
7. In the workbench, embed `StopCard` and cycle the previews (relaxed / heads-up / leave-now /
   missed / schedule-only / empty / loading / error / missing).
8. Run `docker compose --profile full up -d` — the SPA at `:3300` proxies `/api` to the REST
   backend at `:3100` and shows the same dashboard.

## 🗂️ Project Layout

```text
backend/
├── src/
│   ├── index.ts                 dual-mode entry (--http / --mcp)
│   ├── config.ts                PORT, MCP_PORT, DB_PATH, feed URLs, realtime TTLs
│   ├── http/                    Hono REST app + server
│   ├── mcp/                     MCP server (streamable HTTP) + tools
│   ├── services/                schedule, refresh, config (stop list + thresholds)
│   ├── providers/carris-metropolitana/   GTFS + realtime feed adapters
│   ├── db/                      Drizzle schema, client, migrate
│   └── lib/                     schemas, errors, logger, time
├── drizzle/                     SQL migrations
└── drizzle.config.ts
frontend/
├── src/
│   ├── components/              StopCard (published), StopSearch, StopTimesList,
│   │                            StopCoverage, ConfigPanel, ui/
│   ├── pages/                   Dashboard, Config
│   ├── api/                     client, queries, types, baseUrl (runtime /config.json)
│   ├── lib/                     urgency (thresholds), time, useDebounce, utils
│   └── index.ts                 library entry (published surface)
├── .storybook/                  Storybook config (addon-docs, Tailwind)
├── tests/                       Vitest + Testing Library
├── vite.config.ts               app build (dist-app)
└── vite.lib.config.ts           library build (dist-lib)
Dockerfile.backend / Dockerfile.frontend / Dockerfile.storybook
deploy/                          nginx confs + templates + entrypoint scripts
docs/                            module guides (clarify.md)
```

## 🔧 Troubleshooting

- **Port already in use**: Vite picks the next free port automatically; use the printed URL. For
  the backend, set `PORT` / `MCP_PORT` explicitly.
- **"Stop not found in the current schedule"**: the stop id is not in the ingested feed — refresh
  the schedule or search for the correct stop.
- **SPA shows no data / network errors**: make sure the backend is running on `:3000` (dev) or the
  `bus-catcher-backend` service is healthy (Compose); the SPA proxies `/api` to it.
- **Stale schedule data**: trigger a refresh (`POST /api/refresh` or the Refresh button) — status
  reports staleness.
- **Wrong database**: native runs use `../../data/bus-catcher.db` from the backend package
  directory (repo-root `data/`); override with `DB_PATH` if you need a different file.

## 📦 Versioning & Releases

The module releases **independently** via changesets: `@sousa99/bus-catcher-backend` and
`@sousa99/bus-catcher-components` share one version (fixed group) and start at `0.0.1`. A release
publishes the components package to GitHub Packages and the backend/frontend container images to
GHCR, plus a GitHub release. See the repository root `AGENTS.md` for the release workflow.