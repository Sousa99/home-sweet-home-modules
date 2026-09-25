# Research — Live ETA (002)

**Date**: 2026-09-25

Consolidated findings for the realtime-ETA phase. The spec (002) targets the
**Carris Metropolitana realtime** source; this file confirms the endpoint and
locks the integration decisions, mirroring the research structure used for 001.

## 1. Realtime source: Carris Metropolitana API v2 (confirmed)

- **Decision**: use the Carris Metropolitana open API
  (`https://api.carrismetropolitana.pt/v2`) as the realtime source, matching
  the schedule provider already used for static GTFS (same network, same
  stop/trip identifiers).
- **Endpoint**: `GET /arrivals/by_stop/:id` — "Returns all arrivals for a
  given day for a given stop." Each arrival carries the **estimated**
  (live), **scheduled**, and **observed** arrival as string + Unix timestamp,
  plus `trip_id`, `line_id`, `headsign`, `stop_sequence`, `vehicle_id`:

  ```json
  {
    "estimated_arrival": "06:10:50",
    "estimated_arrival_unix": 1751778650,
    "headsign": "Carcavelos (Estação)",
    "line_id": "1604",
    "observed_arrival": "06:10:55",
    "observed_arrival_unix": 1751778655,
    "pattern_id": "1604_0_3",
    "route_id": "1604_0",
    "scheduled_arrival": "06:11:00",
    "scheduled_arrival_unix": 1751778660,
    "stop_sequence": 14,
    "trip_id": "1604_0_3_0600_0629_0_9_21NBI",
    "vehicle_id": "41|1217"
  }
  ```

- **Rationale**: open (no key, CORS-open per the same API that serves the
  GTFS feed the module already ingests), and — critically — `trip_id` matches
  the static GTFS trip ids in our local DB, so predictions can be merged onto
  scheduled passings by `(trip_id, stop_id)`. `estimated_arrival_unix == null`
  is the natural "no live ETA for this bus" signal the feature must make
  visible (spec FR-002/FR-003).
- **Alternatives considered**:
  - `POST /v2/pips/estimates` (`{ stops: [...] }`): batched estimates used by
    the physical Passenger Information Screens; simpler shape
    (`estimatedTimeUnixSeconds`, `timetabledArrivalTime`, `lineId`, `stopHeadsign`)
    but its `journeyId` is a truncated trip id (no operator suffix) and it is
    deliberately coarse (screens, not trip-exact). Rejected for trip-level
    matching; kept as a fallback if per-stop arrivals prove too heavy.
  - GO/TML hub GTFS-RT (`/v1/realtime/eta/...`): valid GTFS-RT TripUpdates but
    multi-operator and flagged experimental; the 001 research already deferred
    it in favor of CM. Rejected for 002 (user chose CM realtime).
  - CM `/v2/vehicles`: live positions only, no per-stop ETA; out of scope (no
    map widget in this feature).

## 2. Merge model (live onto scheduled)

- **Decision**: the schedule service keeps producing the N next scheduled
  passings from the local DB (as in 001); the realtime layer enriches each
  passing in place. Where the CM feed has a fresh prediction for that
  `(trip_id, stop_id)`, the passing becomes `source: "live"` with
  `predictedAt` and `delayMinutes`; otherwise it stays `source: "scheduled"`.
  Realtime-only arrivals whose `trip_id` has no matching schedule row are
  skipped with a warning log (spec edge case; never a phantom bus).
- **Rationale**: keeps the 001 contract stable (FR-010/SC-005) — `Passing`
  gains optional, backward-compatible fields — and preserves the schedule as
  the resilient baseline when the feed is down.

## 3. Freshness, staleness, and caching (constitution II)

- **Decision**: the backend is the single poller/cache. Per-stop arrivals are
  fetched on demand through a small in-memory TTL cache (~15 s); the
  dashboard already polls at 60 s, so each dashboard refresh reuses a live
  cache entry and rarely hits the source more than once per minute per stop.
- **Staleness**: the arrivals JSON exposes no explicit feed timestamp, so the
  module records `fetched_at` locally and applies a realtime staleness budget
  (`REALTIME_STALE_AFTER_MS`, default ~90 s). A prediction whose fetch is
  older than the budget MUST be demoted to `source: "scheduled"` and never
  presented as live (FR-005). This is the same rule already applied to
  schedule freshness in 001.
- **Rate limits**: CM's API is open; the TTL cache plus a single-flight guard
  per stop prevents bursts when several configured stops refresh together.
- **Failure isolation**: a failed/down arrivals fetch degrades that stop to
  schedule-only with the per-stop notice (FR-004/FR-007); a global feed
  failure is surfaced via `GET /api/status` realtime fields. Never fatal.

## 4. Time handling

- **Decision**: reuse the 001 model — UTC canonical internally,
  Europe/Lisbon display, DST-aware. Arrival Unix timestamps from CM are
  absolute epochs; `scheduledAt` stays the schedule-derived ISO UTC; when a
  live prediction exists, `predictedAt` is the ISO UTC of
  `estimated_arrival_unix`. `delayMinutes = round((estimated − scheduled)/60s)`
  signed (positive = late). Countdowns continue to use `now − arrival`.

## 5. Coverage semantics (the "difference must be visible" requirement)

- Per **bus**: `source` (`live` | `scheduled`) is the row-level marker.
- Per **stop**: a `realtime` block on `GET /api/stops/:id/times` reports
  `{ available, lastUpdate, liveCount, totalCount }` so the SPA can say
  "Live times for 2 of 5 buses · updated Xs ago" or "Live times unavailable"
  (spec US2/US4; FR-010).
- Per **dashboard**: `GET /api/status` gains realtime freshness fields
  (`realtimeLastUpdate`, `realtimeAvailable`, `realtimeStale`) for a global
  banner when the feed is down (spec edge case).

## 6. Scope boundaries

- No map / vehicle positions (CM `/vehicles` deferred to a future feature).
- No push/SSE — SPA polling only (spec assumption).
- Single home user; no new auth or storage beyond an in-memory cache and
  `metadata` keys (`realtime_last_fetch`).

## 7. Config additions

- `realtimeUrl` (default `https://api.carrismetropolitana.pt/v2`),
  `realtimeTtlMs` (default 30 000), `realtimeStaleAfterMs` (default 90 000),
  overridable via env (`CM_REALTIME_URL`, `REALTIME_TTL_MS`,
  `REALTIME_STALE_AFTER_MS`) — see `backend/src/config.ts`.