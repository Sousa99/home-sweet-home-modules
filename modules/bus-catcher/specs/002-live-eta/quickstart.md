# Quickstart — Live ETA (002)

**Date**: 2026-09-25

Runnable validation guide proving live-ETA works end-to-end. Details live in
[research.md](research.md), [data-model.md](data-model.md), and
[contracts/](contracts/); this file is a run guide only.

## Prerequisites

- Node 24, pnpm 11 (`pnpm install` at repo root).
- A populated schedule DB from feature 001 (`pnpm --filter ./backend ingest`).
- Internet access to `https://api.carrismetropolitana.pt/v2` (realtime).

> Realtime runtime defaults live in `backend/src/config.ts` and can be
> overridden via env: `CM_REALTIME_URL` (default
> `https://api.carrismetropolitana.pt/v2`), `REALTIME_TTL_MS` (default 15000),
> `REALTIME_STALE_AFTER_MS` (default 90000).
>
> **Re-ingest required**: the CM static feed renumbered many stop ids while the
> realtime feed still uses the legacy ids (e.g. static `360322` ↔ realtime
> `060322`). Live ETAs only resolve after a fresh `pnpm --filter ./backend
> ingest` populates each stop's `realtime_id` (the schema migration
> `0001_curvy_slapstick` adds the column automatically on next start).

## 1. Run the backend (REST + MCP)

```bash
pnpm --filter ./backend dev          # REST API (Hono) on :3000
pnpm --filter ./backend dev:mcp      # MCP server on :3001/mcp
```

**Validate REST** (`contracts/rest-api.md`):

```bash
curl -s "localhost:3000/api/stops/<id>/times?limit=5"
curl -s localhost:3000/api/status
```

- **Expected**: `times` rows carry `source` (`live` | `scheduled`);
  live rows also carry `predictedAt` + `delayMinutes`; a `realtime` block
  reports `{ available, lastUpdate, liveCount, totalCount }`.
- With the feed reachable and the stop in operation, most buses should be
  `source: "live"`. During a feed outage or for stops with no coverage, rows
  are `source: "scheduled"` and `realtime.available === false` — no error.
- `status` includes `realtimeLastUpdate` / `realtimeAvailable` /
  `realtimeStale`.

**Validate MCP**: invoke `get_stop_times` and `get_status` on
`http://localhost:3001/mcp`; outputs match the REST payloads for the same
inputs.

## 2. Run the SPA

```bash
pnpm --filter ./frontend dev         # Vite on :5173, proxies /api → :3000
```

1. Open the dashboard with configured stops (from feature 001).
2. Each bus row shows a **Live** marker (predicted time + delay delta such as
   "+4 min" or "on time") or a **Schedule** marker with the timetable time —
   the difference is visible per row (US1).
3. A stop with no live coverage (or feed down) shows a notice such as "Live
   times unavailable — showing schedule" above its list, with all rows marked
   Schedule (US2).
4. The dashboard still works entirely in schedule-only mode with no errors if
   the realtime feed is unreachable (FR-007).

- **Expected**: live/scheduled distinguishable at a glance (SC-002);
  predictions refresh with the dashboard's polling; feed-down state is visible
  and non-breaking (SC-003).

## 3. Gates

```bash
pnpm lint && pnpm format && pnpm test && pnpm typecheck
node scripts/scaffold.mjs --check
```

All must pass before merge. Vitest covers CM arrivals parsing, realtime
staleness demotion, merge/delay math, route/tool contracts, and the SPA
Live/Schedule UI.

## Smoke checklist

- [ ] `GET /api/stops/:id/times` returns `source`, `predictedAt`,
      `delayMinutes` on live rows and a `realtime` block
- [ ] A stale/missing prediction is demoted to `source: "scheduled"`
- [ ] Feed-down (simulated) yields all-scheduled rows, `realtime.available
      false`, and no 5xx
- [ ] MCP `get_stop_times` / `get_status` mirror REST
- [ ] Dashboard shows Live/Schedule per row + delay delta
- [ ] Dashboard shows the per-stop coverage notice and realtime banner
- [ ] All quality gates pass