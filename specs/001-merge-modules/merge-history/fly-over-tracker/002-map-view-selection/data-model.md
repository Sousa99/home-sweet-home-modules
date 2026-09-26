# Data Model: Map View & Selection

This feature is frontend-only; the backend domain model (see
`specs/001-planes-over-location/data-model.md` and `backend/src/domain/types.ts`) is unchanged
except for the additive nullable `destinationAirport`/`destinationCountry` fields on `Aircraft`
(null until a destination lookup source exists). The new state introduced by this feature is the
**view mode** and the **shared location selection** used to drive both the typed form and the map.

## Entities

### ViewMode

The display mode for fly-over results.

| Field | Type | Values | Notes |
|-------|------|--------|-------|
| `mode` | union | `'list'` \| `'map'` | Owned by `App`. Defaults to `'list'` (spec assumption). |

- Not persisted across reloads (spec assumption).
- Switching modes preserves the current query and results (spec FR-003).

### LocationDraft

The single shared source of truth for the selected location. Identical in shape to the existing
`LocationQuery` (`frontend/src/api/types.ts`), so no new wire type is introduced.

| Field | Type | Constraint | Source |
|-------|------|-----------|--------|
| `lat` | number | `-90 ≤ lat ≤ 90` | typed input or map center marker |
| `lng` | number | `-180 ≤ lng ≤ 180` | typed input or map center marker |
| `radiusKm` | number | `0 < radiusKm ≤ MAX_RADIUS_KM` (500) | typed input or map edge marker |

- Owned by `App`; passed to `FlyOverForm` and `FlyOverMap` as props.
- Both components write to the same value → bidirectional consistency (spec FR-006/FR-007).
- Validation mirrors the backend bounds; map selections are clamped to valid ranges
  (spec FR-011) and the form still rejects invalid typed values with the existing inline errors.
- The query runs only from this single value on explicit submit (spec FR-010), reusing the
  existing `LocationQuery` contract — no drift between input methods (spec FR-012).

### MapSelection (derived, visual only)

The on-map representation of a `LocationDraft`. Not stored; recomputed from the draft.

| Element | Derivation |
|---------|-----------|
| Center marker | positioned at `(lat, lng)`; draggable — its drag-end writes `lat`/`lng` |
| Edge marker | positioned at distance `radiusKm` from center along the current heading; draggable — radius recomputed as `haversine(center, edge)` |
| Radius circle | `Circle` centered at `(lat, lng)` with radius `radiusKm` |

- Panning/zooming moves only the viewport, never these elements (spec FR-008).
- Aircraft markers are rendered from the existing `FlyOverResult.aircraft` at each
  `(latitude, longitude)` and are read-only.

## Relationships

```
App ── owns ──▶ ViewMode ('list' | 'map')
 │
 ├── renders FlyOverForm  ──(value/onChange)──┐
 │                                             ▼
 └── renders FlyOverMap   ──(value + onDraft)──▶ LocationDraft ──(submit)──▶ LocationQuery ──▶ getFlyOvers()
```

## State transitions

| Transition | Trigger | Effect |
|-----------|---------|--------|
| `list → map` | toggle | Same query/results; map renders center, radius circle, aircraft markers |
| `map → list` | toggle | Same query/results; list re-renders from the same result (no re-query) |
| `LocationDraft` change (map) | center marker drag end | `lat`/`lng` inputs update (≤1s) |
| `LocationDraft` change (map) | edge marker drag end | `radiusKm` input updates (≤1s) |
| `LocationDraft` change (inputs) | user edits a field | map center/edge/circle reposition to match |
| Query | "Find aircraft" submit | `getFlyOvers(draft)`; results update both modes |
| Refresh | Refresh button | `getFlyOvers(last submitted draft)` |

## Validation rules

Mirrors the backend `LocationQuerySchema` and the form's existing `validate()`:

- `lat` finite and within `[-90, 90]`
- `lng` finite and within `[-180, 180]`
- `radiusKm` finite, `> 0`, `≤ MAX_RADIUS_KM` (500)

Map interactions clamp to these bounds; typed input is rejected with inline field errors.