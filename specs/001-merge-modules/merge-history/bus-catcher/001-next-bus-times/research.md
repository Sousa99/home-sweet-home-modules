# Research — Next Bus Times (001)

**Date**: 2026-09-23

Consolidated findings from Phase 0. Each decision lists the choice, rationale,
and alternatives considered.

## 1. Transit data source

- **Decision**: **Carris Metropolitana** static **GTFS** feed from
  `https://api.carrismetropolitana.pt/gtfs` (zip; redirects to `/v2/gtfs`),
  ingested into the module's local SQLite database. (An earlier city-Carris
  feed at `gateway.carris.pt` was replaced — the module targets the
  metropolitan network.)
- **Rationale**: Free, keyless, CORS-open (verified live, HTTP 200), and an
  actively maintained feed (current service span through 2026-12-31). The
  spec asks for **scheduled passing times**; the static GTFS delivers exactly
  that. The feed is too large to query at runtime (~2.4 M `stop_times` rows),
  so a one-time local ingest is required.
- **Alternatives considered**:
  - **Google (Maps Platform)**: exposes Lisbon bus times but requires a paid
    API key and has restrictive transit-terms; rejected for v1.
  - **Carris Metropolitana realtime (ETA)**: gated? no — CM publishes an open
    realtime feed; exact endpoints to be confirmed for the future `002-live-eta`
    feature.
  - **GO/TML open-data hub** (`go.tmlmobilidade.pt`): unified GTFS for all
    operators and experimental GTFS-RT ETA. Kept as the **future realtime
    provider** and a backup schedule source, but its ETA is flagged
    experimental by the operator.

## 2. Scheduling model (next passing times)

- **Decision**: resolve the "next buses at stop S" as a scheduled lookup on
  the active service day.
- **Rationale**: matches the spec ("scheduled passing time") and is cheap once
  the feed is ingested.
- **Details**:
  - Active service for a calendar date `D` = `calendar` rows whose weekday bit
    matches `D`, `start_date <= D <= end_date`, **adjusted** by
    `calendar_dates` exceptions (exception_type 1 adds, 2 removes).
  - Candidate trips = trips whose `service_id` is active.
  - Passing times = `stop_times` at stop S on those trips with
    `arrival >= now`, ordered ascending, limited to N (default 5), optionally
    filtered by line (`route_id` set).
  - GTFS clock times can exceed 24:00 (e.g. `25:30` = 01:30 next service day);
    stored as integer minutes since service-day midnight.
- **Alternatives considered**: GTFS-RT TripUpdates ETA — deferred by decision;
  exact timepoint vs. interpolated stop_times — the feed marks `timepoint`;
  use `arrival_time` directly for v1.

## 3. Data ingestion

- **Decision**: a backend refresh process that downloads the zip, parses the
  GTFS text files, and bulk-upserts rows; guarded by a single-flight lock.
- **Rationale**: 2.4 M `stop_times` rows require batched inserts inside
  transactions (better-sqlite3) to meet the <2 min ingest target.
- **Details**: store feed version + fetched-at in a `metadata` table so
  freshness (spec FR-009, constitution II) is queryable. Schema-validate each
  record during parse (zod) — unknown/malformed records are skipped with a
  warning, never a crash (constitution: Data & Integration Constraints).

## 4. Time & timezone handling

- **Decision**: canonical UTC internally; display in Europe/Lisbon with DST.
- **Rationale**: constitution principle V; Portugal observes DST (WET/WEST,
  UTC+0/+1), so naive local math is wrong twice a year.
- **Details**: GTFS times are Lisbon wall-clock. Convert a stop_time
  (service-day minutes) to an absolute `Date` by applying the service-day's
  Europe/Lisbon offset, then store/compare as UTC epoch. Countdown = now −
  arrival epoch. Times past midnight roll to the next calendar day.

## 5. Backend framework & interfaces

- **Decision**: **Hono** (`hono` + `@hono/node-server`) for REST; the
  `@modelcontextprotocol/sdk` for MCP; both share one service layer.
- **Rationale**: constitution requires REST (`--http`) and MCP (`--mcp`) to
  share the same service layer and never be split; Hono is minimal,
  TypeScript-first, and its `app.request()` is ideal for Vitest route tests.
- **Alternatives considered**: Fastify (more opinionated, heavier); plain
  `node:http` (more boilerplate, no schema validation integration).

## 6. Validation (zod)

- **Decision**: zod schemas are the single source of truth for request
  bodies, query params, response payloads, and DB-row DTOs (`z.infer`).
- **Rationale**: user directive + constitution IV/V (testable contracts,
  fail-closed responses). Input validated before processing; output validated
  before sending so a malformed payload surfaces as a 500 + structured log,
  never a broken 200.
- **Alternatives considered**: TypeScript-only types (runtime hole), manual
  guards (duplication).

## 7. Frontend data layer

- **Decision**: **TanStack Query v5** (`useQuery`/`useMutation`) over a small
  typed fetch client.
- **Rationale**: user directive; query caching, retries, and
  `refetchInterval` give the dashboard a <2 s load (SC-002) and keep the
  displayed schedule fresh (FR-009) without bespoke state code.
- **Alternatives considered**: plain `fetch` + `useEffect` (more code, no
  caching/retry); Redux Toolkit (overkill for this module).

## 8. Scaffold gaps this feature must close

- No `backend/src` at all; no `tsconfig.json` in `backend/` or `frontend/`;
  frontend lacks `index.html`, `main.tsx`, `App.tsx`, and `.storybook/`.
- **Decision**: this "basic setup" feature creates the runnable app skeleton
  (backend entrypoints + db, SPA bootstrap) in addition to the bus-times
  functionality; `.storybook` and the published component library are not
  needed for v1 (the `build:lib` script remains intact).

## 9. Future realtime integration (documented seam)

Scheduled times are v1; live updates arrive later without touching the
application contract (spec FR-010, SC-005; constitution principle III).

- **Realtime sources (GTFS-RT)**: `TripUpdates` (per-stop predicted
  arrival/departure or `delay` vs. schedule) upgrades our `scheduledAt`;
  `VehiclePositions` (live lat/lon, speed) enables a live map / nearest-bus.
- **Lisbon availability**: Carris's own realtime feed is gated ("public, not
  free"; powers Google Maps + CARRISway). The realistic open source is the
  **GO/TML hub** (`go.tmlmobilidade.pt`), which publishes GTFS-RT
  TripUpdates/VehiclePositions (ETA flagged experimental). The future
  provider is therefore GO/TML GTFS-RT.
- **Merge model**: a `RealtimeProvider` implements the same `ScheduleProvider`
  interface; it polls GO/TML into a backend cache (~15-30 s), matches
  predictions by trip_id + stop_id against our schedule rows, and returns the
  same `Passing[]` DTO (optionally adding `source`/`delayMinutes` as
  backward-compatible fields). The dashboard component is unchanged.
- **Positions**: a separate capability behind the same provider interface
  (`getVehiclePositions(area)`), served by a future endpoint + map widget —
  a new consumer, not a rewrite.
- **Delivery**: backend is the single poller + cache; SPA refreshes via
  TanStack `refetchInterval` (push/SSE optional later). Freshness covers both
  worlds: scheduled `last_refresh` and the realtime feed's own timestamp,
  with stale-data flagging per constitution II.
- **Ingest execution**: the heavy parse + atomic SQLite ingest runs on a
  **worker thread** (`services/refresh-worker.ts`) with a dedicated
  `createIngestSqlite` connection (WAL, `synchronous=OFF`,
  `wal_autocheckpoint=0`, one final `wal_checkpoint(TRUNCATE)`), so the
  REST/MCP server stays responsive during a refresh. The download runs on the
  main thread and the buffer is posted to the worker. (This supersedes an
  earlier chunked-yield design that proved slow due to WAL checkpointing.)
- **Deferred to a separate feature** (e.g. `002-live-eta`); Phase 2 only must
  keep the `ScheduleProvider` interface honest.

- No `backend/src` at all; no `tsconfig.json` in `backend/` or `frontend/`;
  frontend lacks `index.html`, `main.tsx`, `App.tsx`, and `.storybook/`.
- **Decision**: this "basic setup" feature creates the runnable app skeleton
  (backend entrypoints + db, SPA bootstrap) in addition to the bus-times
  functionality; `.storybook` and the published component library are not
  needed for v1 (the `build:lib` script remains intact).