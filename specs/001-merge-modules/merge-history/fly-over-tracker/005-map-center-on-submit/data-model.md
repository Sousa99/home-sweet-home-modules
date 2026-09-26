# Data Model — Center Map on Selection Submit

**Feature**: specs/005-map-center-on-submit | **Phase 1 output**

This feature introduces no persistent storage and no new entities; all state is the existing
in-memory React state lifted to `App` (session-only). The entities below describe the state the
feature operates on and its transitions. No records are stored or transmitted beyond the existing
`/api/fly-overs` query.

## Entities

### LocationQuery (existing — unchanged)

The input to the fly-over capability, reused from `frontend/src/api/types.ts`.

| Field | Type | Constraints |
|-------|------|-------------|
| `lat` | `number` | -90 … 90 |
| `lng` | `number` | -180 … 180 |
| `radiusKm` | `number` | 0.1 ≤ r ≤ 463 (MIN/MAX_RADIUS_KM) |

Three instances are relevant to this feature in `App`:
- `draft` — the user's in-progress location (inputs/map). Changes never trigger a fit.
- `query` — the last location actually submitted. Doubles as the map's **fit request**; a change
  to `query` (a new submit) is the only event that triggers a fit.
- `mapCenter` / `mapRadiusKm` — derived from `draft`; drive the rendered circle and markers.

**State transitions**: `draft` is updated by any input method and becomes `query` only on the
explicit "Find aircraft" submit (`App.tsx` `handleSubmit`).

### MapView (conceptual — the map's center and zoom)

The Leaflet map's current view (center point + zoom level). Not stored in React state; owned by
the Leaflet map instance.

**Transitions**:
- `user-edit`: the user pans/zooms freely. Never changes the selection and never triggers a fit.
- `fit`: the `MapFitController` calls `flyToBounds` — only on mount with a pending `fitRequest`, or
  when `fitRequest` changes (a new submit). After a fit, the view returns to `user-edit` control.

**Fit bounds derivation** (pure, from `LocationQuery`):
- `circleBounds(center, radiusKm)` → `{ southwest, northeast }`, computed via `destPoint` at
  bearings 225° and 45°. Both points lie within the circle's bounding box; `center` is the box
  midpoint.
- The controller fits to the circle box's corners inflated by 3% with `maxZoom: 19`, so the
  circle fills ~94% of the frame while the full circle stays visible.

## FitRequest lifecycle

The fit request is implicit — it is the `query` value passed to the map:

| State | Map mounted? | Effect |
|-------|--------------|--------|
| `query === null` (nothing submitted) | no/yes | No fit. Map shows the default view. |
| New `query`, map mounted | yes | `MapFitController` refits on prop change. |
| New `query`, map not mounted (list mode) | no | Fit is pending; `query` recorded. |
| Same `query`, map mounts (switch to map) | yes | Fit applies on mount (pending case). |
| Same `query`, map remounts again (mode switch, no new submit) | yes | No fit — `fitRequest` unchanged. |

## Relationships

- `query` → `MapFitController`: the submitted `LocationQuery` fully determines the fit geometry;
  no other state participates.
- `draft` → circle/markers: unchanged from feature 002; explicitly decoupled from the fit so
  editing never moves the view.

## Non-goals (explicitly out of model)

- No persistence of the fit request or the map view across reloads.
- No new data entities, no backend-side changes.
- The fit never influences the query result — it is purely a presentation behavior on the map
  view.