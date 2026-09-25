# Quickstart — Next Bus Times (001)

**Date**: 2026-09-23

Runnable validation guide proving the feature works end-to-end. Details live
in [data-model.md](data-model.md) and [contracts/](contracts/); this file is a
run guide only.

## Prerequisites

- Node 24, pnpm 11 (`pnpm install` at repo root).
- Internet access to `https://api.carrismetropolitana.pt/gtfs` on first
  ingest (Carris Metropolitana network).

## 1. Ingest the schedule

```bash
pnpm --filter ./backend ingest
```

- Downloads the Carris GTFS zip, parses, and bulk-loads into
  `./data/bus-catcher.db` (batched inserts; target < 2 min).
- **Expected**: exit 0; `metadata.last_refresh` and `feed_version` set.
- Unknown/malformed records are skipped with a warning (never crash).

## 2. Run the backend (REST + MCP)

```bash
pnpm --filter ./backend dev          # REST API (Hono) on :3000
pnpm --filter ./backend dev:mcp      # MCP server on :3001/mcp
```

**Validate REST** (`contracts/rest-api.md`):

```bash
curl -s localhost:3000/api/status                         # freshness
curl -s "localhost:3000/api/stops?q=avenida"              # search stops
curl -s "localhost:3000/api/stops/<id>/times?limit=5"     # next buses
curl -s -X POST localhost:3000/api/config/stops \
  -H 'content-type: application/json' \
  -d '{"stopId":"<id>","lineFilter":["736"]}'             # save a stop
curl -s localhost:3000/api/config                         # saved stops
curl -s -X POST localhost:3000/api/refresh                # re-ingest
```

- **Expected**: `status` returns `lastRefresh`/`feedVersion`/`stale`/`refreshing`;
  `times` lists upcoming buses with `scheduledAt` (UTC) + `minutesUntil`;
  config round-trips.

**Validate MCP** (`contracts/mcp-tools.md`): connect an MCP client to
`http://localhost:3001/mcp` and invoke `get_stop_times`, `add_stop`,
`get_config`, `get_status`; confirm outputs match the REST responses for the
same inputs.

**Refresh**: `POST /api/refresh` (or the dashboard "Refresh schedule" button)
re-downloads and re-ingests the feed on a **worker thread** — the server stays
responsive during the ingest (see the "Refreshing…" status banner).

## 3. Run the SPA

```bash
pnpm --filter ./frontend dev         # Vite on :5173, proxies /api → :3000
```

1. Open the configuration panel, search a stop (e.g. "avenida"), pick one,
   optionally restrict to a line, save.
2. Reload — the saved stop persists (config lives server-side).
3. Open the dashboard — see next scheduled buses (line, destination,
   scheduled time, "in X min") and the last-refresh indicator.
4. Manage configured stops (edit filter, reorder, enable/disable, remove);
   a stop or line that vanished from a refreshed feed is flagged.

- **Expected**: config survives reload (FR-006); dashboard renders in < 2 s
  (SC-002) and refreshes via TanStack Query polling.

## 4. Gates

```bash
pnpm lint && pnpm format && pnpm test && pnpm typecheck
node scripts/scaffold.mjs --check
```

All must pass before merge. Vitest covers service-day resolution, DST/`>24h`
time handling, the next-times query, config CRUD, and route/tool contracts.

## Smoke checklist

- [ ] Ingest completes; freshness visible via `GET /api/status`
- [ ] `GET /api/stops/:id/times` returns correct, ordered scheduled times
- [ ] Config create/update/delete persists and is served to the SPA
- [ ] MCP tools mirror REST results
- [ ] `POST /api/refresh` runs with the server staying responsive (worker)
- [ ] Dashboard shows configured stops + times + freshness in < 2 s
- [ ] A vanished stop is flagged (`missing`) in dashboard and config
- [ ] All quality gates pass