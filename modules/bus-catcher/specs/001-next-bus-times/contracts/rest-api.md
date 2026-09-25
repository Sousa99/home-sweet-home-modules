# REST API Contract — Next Bus Times (001)

**Date**: 2026-09-23

All request/response payloads are validated with **zod** schemas (single
source of truth; TypeScript types derived via `z.infer`). Invalid input
returns `400`; a response that fails validation is treated as a server error
(`500` + structured log), never a malformed `200`.

Base path: `/api` (SPA dev proxy forwards `/api` → `http://localhost:3000`).
All responses are JSON. Times are ISO-8601 strings in UTC; display conversion
happens on the client in Europe/Lisbon.

## Common shapes

```ts
// zod schema names used below; actual definitions live in
// backend/src/lib/schemas.ts (contract mirrors them here for reference)

Line      = { id, shortName, longName }
Stop      = { id, name, lat, lon, lines: Line[] }
Passing   = { lineId, lineShortName, headsign, scheduledAt /* ISO UTC */, minutesUntil }
ConfigStop = { id, stop: Stop, lineFilter: string[], displayOrder, enabled }
Status    = { lastRefresh: string | null, feedVersion: string | null, stale: boolean }
```

## Endpoints

### `GET /api/status`

Freshness + ingest state (FR-009 / constitution II).

**200** → `Status`

### `GET /api/lines`

List all lines in the ingested network.

**200** → `{ lines: Line[] }`

### `GET /api/stops?q=<string>&limit=<int=20>`

Search stops by name (case-insensitive substring).

- `q` required, min length 2.
- **200** → `{ stops: Stop[] }`
- **400** → invalid `q`

### `GET /api/stops/:id`

Stop detail including lines serving it (FR-003).

- **200** → `{ stop: Stop }`
- **404** → unknown stop id

### `GET /api/stops/:id/times?limit=<int=5>&line=<string>...`

Next N scheduled passing times for a stop on the current service day
(FR-004), optionally filtered by one or more `line` params.

- `limit` default 5, max 20.
- `line` may repeat; times shown only for those lines.
- **200** → `{ stopId, times: Passing[] }`
- **404** → unknown stop id; **400** → invalid `limit`/`line`

### `GET /api/config`

List configured stops in `displayOrder` (FR-006/FR-008).

**200** → `{ stops: ConfigStop[] }`

### `POST /api/config/stops`

Add a configured stop (FR-005).

Body: `{ stopId: string, lineFilter?: string[], displayOrder?: number, enabled?: boolean }`

- **201** → `{ stop: ConfigStop }`
- **400** → body fails schema (unknown stop id, unknown line ids, empty
  `stopId`)
- **409** → stop already configured

### `PUT /api/config/stops/:id`

Update a configured stop (FR-007): change `lineFilter`, `displayOrder`,
`enabled`.

Body: partial `{ lineFilter?, displayOrder?, enabled? }`

- **200** → `{ stop: ConfigStop }`
- **404** → unknown config id; **400** → invalid body / unknown line ids

### `DELETE /api/config/stops/:id`

Remove a configured stop (FR-007).

- **204** → removed
- **404** → unknown config id

### `POST /api/refresh`

Trigger a schedule re-ingest (FR-011). Single-flight: concurrent requests
return `202` + `{ status: "in_progress" }` if a refresh is already running.

- **202** → `{ status: "started" | "in_progress" }`

## Error envelope

Errors use `{ error: string, detail?: unknown }`. Status codes as above.