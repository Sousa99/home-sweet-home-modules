# Data Model — SPA UX Improvements

**Feature**: specs/004-spa-ux-refresh-location | **Phase 1 output**

This feature introduces no persistent storage; all data is in-memory React state lifted to `App`
(session-only). The entities below are the UI/domain state the feature operates on. No records are
stored or transmitted beyond the existing `/api/fly-overs` query.

## Entities

### LocationQuery (existing — unchanged)

The input to the fly-over capability. Reused from `frontend/src/api/types.ts`.

| Field | Type | Constraints |
|-------|------|-------------|
| `lat` | `number` | -90 … 90 |
| `lng` | `number` | -180 … 180 |
| `radiusKm` | `number` | 0 < r ≤ 463 (MAX_RADIUS_KM) |

Two instances live in `App`:
- `draft` — the user's in-progress location, edited by the inputs, the map, or the geolocation
  control. May be `null` before any input.
- `query` — the last location actually submitted. May be `null` before the first submit; drives
  manual and automatic refresh.

**State transitions**: `draft` is updated by any input method (typed, map, current location) and
becomes `query` only on an explicit "Find aircraft" submit.

### RefreshRate (new type)

The user's selected automatic-refresh cadence.

| Value | Meaning |
|-------|---------|
| `'off'` | No automatic refresh (default; preserves current behavior) |
| `5` / `10` / `30` / `60` | Re-run the last submitted `query` every N seconds |

**Constraints**: exactly these five choices (FR-007); default `'off'`; not persisted across page
loads.

**State transitions**: changing the rate clears the active interval and starts a new one; a
non-off rate does not trigger any query while `query === null`; a tick is skipped when a refresh
is already in flight.

### GeolocationStatus (new, internal to FlyOverForm)

The lifecycle of the "Use my current location" control.

| State | Meaning |
|-------|---------|
| `idle` | Control available; no lookup in progress |
| `loading` | Lookup in progress; control disabled, showing progress |
| `success` | Position obtained; inputs filled with lat/lng; radius unchanged |
| `error` | Lookup failed; an inline `role="alert"` message shown; inputs unchanged |

**Transitions**:
- `idle → loading` on click.
- `loading → success` when a valid position is reported.
- `loading → error` on `PERMISSION_DENIED`, `POSITION_UNAVAILABLE`, or `TIMEOUT`.
- `idle` (never leaves) when `navigator.geolocation` is unavailable — the control shows an
  availability message instead of launching a lookup.

**Validation rule**: a reported position is accepted only when `isValidLat(lat)` and
`isValidLng(lng)` hold (existing `lib/location.ts`); otherwise treated as `error`.

### ViewMode (existing — unchanged)

`'list' | 'map'`; the active display mode. Unchanged by this feature; the selection panel layout
is centered in both modes.

## Relationships

- `RefreshRate` applies to `query` (the last submitted `LocationQuery`); it never reads `draft`.
- `GeolocationStatus.success` produces a `draft` update (lat/lng from the position, radius
  preserved), which flows through the shared draft into both the inputs and the map — no new
  relationship.

## Non-goals (explicitly out of model)

- No persistence of `RefreshRate` across reloads.
- No storage of the device position beyond the resulting query parameters.
- No backend-side changes or new data entities.