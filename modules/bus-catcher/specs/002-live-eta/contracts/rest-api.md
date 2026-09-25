# REST API Contract — Live ETA (002)

**Date**: 2026-09-25

Evolution of the 001 REST contract. All payloads remain zod-validated
(single source of truth in `backend/src/lib/schemas.ts`). **Backward
compatible**: every field added in 002 is optional; clients that ignore the
new fields keep working against the 001 shapes.

Base path: `/api`. Times are ISO-8601 UTC strings; display conversion happens
on the client in Europe/Lisbon.

## Common shapes

```ts
Passing = {
  lineId: string, lineShortName: string, headsign: string,
  scheduledAt: string /* ISO UTC */, minutesUntil: number,
  // 002 additions (optional):
  source?: 'live' | 'scheduled',      // 'live' iff a fresh prediction exists
  predictedAt?: string,               // ISO UTC — live predicted arrival
  delayMinutes?: number,              // signed; positive = late
}

RealtimeInfo = {                       // 002 — per-stop coverage/freshness
  available: boolean,
  lastUpdate: string | null,           // newest feed fetch used
  liveCount: number,                   // of returned times with source == 'live'
  totalCount: number,
}

Status = {
  lastRefresh: string | null, feedVersion: string | null,
  stale: boolean, refreshing: boolean,
  // 002 additions (optional):
  realtimeLastUpdate?: string | null,
  realtimeAvailable?: boolean,
  realtimeStale?: boolean,
}
```

## Endpoints

### `GET /api/status`

Freshness + ingest state (unchanged) plus realtime feed freshness.

- **200** → `Status`

### `GET /api/stops/:id/times?limit=<int=5>&line=<string>...`

Next N passing times for a stop, now enriched with live predictions
(FR-001/002/003) and per-stop realtime coverage (FR-004/010).

- `limit` default 5, max 20; `line` may repeat.
- **200** → `{ stopId, times: Passing[], realtime: RealtimeInfo }`
- **404** → unknown stop id; **400** → invalid `limit`/`line`
- **Behavior**:
  - A bus with a fresh CM prediction has `source: "live"`, `predictedAt`,
    `delayMinutes`; its shown time is `predictedAt`.
  - A bus with no (or stale, or null-`estimated`) prediction stays
    `source: "scheduled"` with only `scheduledAt`/`minutesUntil`.
  - If the realtime feed is unreachable, times are all scheduled and
    `realtime.available === false` — **never an error** (FR-007).

### All other 001 endpoints

Unchanged (`GET /api/lines`, `GET /api/stops`, `GET /api/stops/:id`,
`GET /api/config`, `POST/PUT/DELETE /api/config/stops`, `POST /api/refresh`).

## Error envelope

Unchanged: `{ error: string, detail?: unknown }` with the 001 status codes.