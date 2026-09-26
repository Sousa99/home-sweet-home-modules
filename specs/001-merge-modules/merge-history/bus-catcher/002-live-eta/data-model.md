# Data Model — Live ETA (002)

**Date**: 2026-09-25

Entities derived from the 002 spec and research. Types are conceptual; exact
zod/TS shapes are defined in `backend/src/lib/schemas.ts` during
implementation. The SQLite schema from 001 is unchanged — this feature adds
only new `metadata` keys and an in-memory cache.

## 1. `Passing` (evolved DTO — backward-compatible)

The 001 scheduled-passing DTO gains optional live fields. Existing consumers
that read only `scheduledAt`/`minutesUntil` keep working unchanged.

| Field | Type | Notes |
|-------|------|-------|
| `lineId` | string | unchanged |
| `lineShortName` | string | unchanged |
| `headsign` | string | unchanged |
| `scheduledAt` | string (ISO UTC) | unchanged — scheduled arrival |
| `minutesUntil` | number | unchanged |
| `source` | `'live' \| 'scheduled'` | **NEW** — which time is shown. `live` iff a fresh prediction exists. |
| `predictedAt` | string (ISO UTC) \| null | **NEW** — live predicted arrival (`estimated_arrival_unix`) |
| `delayMinutes` | number \| null | **NEW** — signed (predicted − scheduled), rounded; positive = late |

- **Semantics**: when `source === "live"`, the UI shows `predictedAt` (with a
  delay delta); otherwise it shows `scheduledAt` and marks the row "Schedule".

## 2. `LivePrediction` (raw realtime arrival, internal)

A parsed arrival from CM `GET /arrivals/by_stop/:id`, kept in the in-memory
TTL cache. It is the input to the merge step; never a DTO.

| Field | Type | Notes |
|-------|------|-------|
| `tripId` | string | CM `trip_id` — matches our GTFS `trips.id` |
| `stopId` | string | CM stop id — matches our `stops.id` |
| `lineId` | string | CM `line_id` |
| `headsign` | string | destination text |
| `estimatedAt` | number \| null | `estimated_arrival_unix` (epoch ms); **null ⇒ no live ETA** |
| `scheduledAt` | number \| null | `scheduled_arrival_unix` (epoch ms) |
| `fetchedAt` | number | epoch ms when this feed snapshot was fetched locally |

- **Freshness rule (constitution II)**: a prediction is eligible as `live`
  only while `now − fetchedAt ≤ REALTIME_STALE_AFTER_MS`; otherwise it is
  demoted and the passing stays `source: "scheduled"`.

## 3. `RealtimeInfo` (per-stop, on the times response)

Freshness/coverage metadata attached to `GET /api/stops/:id/times` so the SPA
can render the per-stop notice (spec US2/US4).

| Field | Type | Notes |
|-------|------|-------|
| `available` | boolean | feed reachable + fresh for this stop |
| `lastUpdate` | string (ISO UTC) \| null | newest `fetchedAt` used for this stop |
| `liveCount` | number | how many returned times are `source: "live"` |
| `totalCount` | number | total returned times |

## 4. `Status` (extended — backward-compatible)

`GET /api/status` gains optional realtime freshness fields for the global
banner when the feed is down.

| Field | Type | Notes |
|-------|------|-------|
| `lastRefresh` / `feedVersion` / `stale` / `refreshing` | unchanged | 001 fields |
| `realtimeLastUpdate` | string (ISO UTC) \| null | **NEW** — last successful realtime fetch |
| `realtimeAvailable` | boolean | **NEW** — feed up within staleness budget |
| `realtimeStale` | boolean | **NEW** — data fetched but older than the budget |

## 5. `metadata` keys (SQLite — additions only)

> **Implementation note**: realtime freshness is tracked **in-memory** on the
> realtime client (last successful fetch), not in `metadata`, because the
> arrivals cache is itself in-memory — persisting the timestamp would report
> stale data as live after a restart. `metadata` is unchanged from 001.

| Key | Value | Purpose |
|-----|-------|---------|
| *(none added)* | — | — |

## Cache (in-memory, non-persistent)

- Key: `stopId`; value: `{ arrivals: LivePrediction[], fetchedAt: number }`.
- TTL: `REALTIME_TTL_MS` (default 15 s). Per-stop single-flight prevents
  duplicate concurrent fetches. The last successful fetch timestamp lives on
  the client and drives the global realtime status. DB is not touched for
  realtime data.

## Merge semantics (schedule + live)

For a stop query:

1. Produce the next N scheduled `Passing[]` exactly as 001 (baseline).
2. Load the stop's cached arrivals (fetch on miss through the TTL cache).
3. For each passing, if a fresh `LivePrediction` matches its `tripId` (+
   `stopId`) with a non-null `estimatedAt`, set `source: "live"`,
   `predictedAt`, `delayMinutes`; else keep `source: "scheduled"`.
4. Arrivals whose `tripId` has no matching schedule row are logged as a
   warning and skipped (never a phantom bus).
5. Sort by shown arrival time (predicted when live, else scheduled); cap at N.