# Data Model: Dashboard Embed Components

Phase 1 output for `specs/006-dashboard-components`. This feature has **no persistence** and
**no new backend data**. It reuses the existing `Aircraft` and `FlyOverResult` entities served
by `GET /api/fly-overs` and derives two widget-scoped concepts on the client: the **widget
configuration** and the **closest aircraft**.

## Entities

### Widget Configuration

The input a dashboard host supplies to either widget. Mirrors the existing `LocationQuery`
plus the auto-refresh cadence and the endpoint target.

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `location` | `LocationQuery` | — | `{ lat, lng, radiusKm }`, validated as in the SPA (`0 < radiusKm ≤ 463`) |
| `autoRefresh` | `RefreshRate` (`'off' \| 5 \| 10 \| 30 \| 60`) | `'off'` | Seconds between automatic refreshes; `'off'` disables |
| `baseUrl` | string | `''` | Base URL of the module backend; `''` = same-origin `/api` |

**Validation rules** (from spec FR-001, FR-005, FR-010, FR-012): `location` must be a valid
`LocationQuery` (the client reuses the SPA bounds); a change to any field triggers a refetch
with the new configuration; invalid `location` is treated as a configuration error surfaced by
the widget (no request fired with out-of-range values).

### Aircraft

The existing live-aircraft entity, unchanged (see `data-model.md` in `specs/001`). Fields used
by the widgets: `icao24`, `callsign`, origin/destination labels, `latitude`, `longitude`,
`altitude`, `onGround`, `velocity`, `trueTrack`, `verticalRate`, `distanceKm`.

### Fly-Over Result

The existing query response, unchanged — `{ center, radiusKm, asOf, count, destinationEnrichment,
aircraft }` where `aircraft` is **sorted ascending by `distanceKm`** (closest first).

### Closest Aircraft

A derived, single-aircraft view over a `Fly-Over Result`.

| Aspect | Rule |
|--------|------|
| Source | `result.aircraft[0]` (the backend-sorted first item) |
| Tie-break | When distances are equal, deterministic selection by `icao24` (stable, independent of feed order) |
| Empty | No `aircraft` → the card shows its empty state (spec FR-013) |
| Identity change | The card transitions smoothly whenever the selected `icao24` changes (spec FR-008) |

### Widget State

Client-side status of a widget's data lifecycle, mirroring the SPA's `FlyOverStatus`.

| State | Meaning | Rendered as |
|-------|---------|-------------|
| `idle` | Mounted, no configuration applied yet | Loading/placeholder hint |
| `loading` | First fetch in flight | Loading hint |
| `success` | Latest fetch returned | Map + list / closest card |
| `error` | Latest fetch failed (feed unavailable/rate-limited) | Clear error state; never stale data as fresh |
| `isUpdating` | Background/manual refetch in flight with existing data | Top-corner `UpdatingIndicator` |

## State Transitions

- **Configuration change** (`location`, `autoRefresh`, `baseUrl`) → refetch with the new
  configuration; the latest configuration wins if a fetch is already in flight.
- **Auto-refresh tick** (when `autoRefresh !== 'off'`) → background refetch; `isUpdating` shows
  only while it runs.
- **Manual refresh** → same as auto-refresh, triggered by the user.
- **Feed unavailable / rate-limited** → `error` state; previous results are not shown as fresh.
- **No aircraft in range** → empty state (map widget: empty list; closest card: empty message),
  not an error.

## Relationships

- A **Widget Configuration** maps to zero or one **Fly-Over Result** at a time (the latest
  fetch).
- A **Fly-Over Result** contains zero or more **Aircraft**; when it contains at least one, the
  **Closest Aircraft** is deterministically selected from it.
- **Widget State** describes the lifecycle of the widget's fetch of that result.

## Interface Parity

No new backend interface. The widgets consume the existing `GET /api/fly-overs` contract
unchanged (closest = `aircraft[0]`); the only client-side contract change is the optional
`baseUrl` on `getFlyOvers` (see `contracts/`).