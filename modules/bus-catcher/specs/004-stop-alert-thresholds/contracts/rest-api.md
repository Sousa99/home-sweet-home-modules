# REST API Contract — Departure Thresholds (004)

**Date**: 2026-09-25

Delta over `specs/001-next-bus-times/contracts/rest-api.md`. All request and
response payloads are validated with **zod** schemas (single source of truth
in `backend/src/lib/schemas.ts`). Error envelope and base path unchanged:
`/api`, `{ error: string, detail?: unknown }`.

## Common shapes

```ts
DepartureThresholds = {
  headsUpMinutes: number;   // resolved: default 10 when unset
  leaveNowMinutes: number;  // resolved: default 5 when unset
  missedMinutes: number;    // resolved: default 1 when unset
}

ConfigStop = {
  id, stop, lineFilter, displayOrder, enabled,   // unchanged
  thresholds: DepartureThresholds,               // NEW — always present, resolved
}
```

`missing` stays optional on `ConfigStop` as before.

## Endpoints

### `GET /api/config`

List configured stops. Each stop now includes resolved `thresholds`.

- **200** → `{ stops: ConfigStop[] }`

### `POST /api/config/stops`

Add a configured stop.

Body:
`{ stopId: string, lineFilter?: string[], displayOrder?: number, enabled?: boolean, thresholds?: { headsUpMinutes?, leaveNowMinutes?, missedMinutes? } }`

- Threshold values must be non-negative integers and
  `headsUpMinutes >= leaveNowMinutes >= missedMinutes` when all three are
  given (unspecified fields resolve to the defaults).
- **201** → `{ stop: ConfigStop }`
- **400** → body fails schema; out-of-order / negative / non-integer thresholds
  (detail includes zod issues)
- **409** → stop already configured

### `PUT /api/config/stops/:id`

Update a configured stop: change `lineFilter`, `displayOrder`, `enabled`,
and/or `thresholds`.

Body: partial `{ lineFilter?, displayOrder?, enabled?, thresholds?: { headsUpMinutes?, leaveNowMinutes?, missedMinutes? } }`

- On partial threshold updates, the unspecified fields fall back to the
  **currently stored** values before the ordering check, so a one-field update
  can never produce an invalid combination.
- **200** → `{ stop: ConfigStop }`
- **404** → unknown config id
- **400** → invalid body / out-of-order thresholds / unknown line ids

### `DELETE /api/config/stops/:id`

Unchanged — removing a stop removes its thresholds with it.

- **204** → removed; **404** → unknown config id

## Validation summary

| Rule | Where | Failure |
|------|-------|---------|
| Non-negative integer minutes | zod per-field | `400 invalid_body` |
| `headsUp >= leaveNow >= missed` (create: vs defaults; update: vs stored) | service layer | `400 invalid_body` |
| Invalid enum/type for other fields | zod | `400 invalid_body` (unchanged) |