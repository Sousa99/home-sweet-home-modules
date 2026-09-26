# Contract: Frontend Component — FlyOverMap (updated)

**Interface**: React component (frontend package, exported from `components/index.ts`)
**Domain**: `fly-over-map` | **Stories**: `FlyOverMap.stories.tsx`

## Purpose

The interactive map showing the selected center and radius (draggable markers), the current
aircraft, and a docked horizontal card per aircraft. This feature adds an optional **`fitRequest`**
prop: when a new selection is submitted, the map animates so the submitted center is centered in
the frame and the selection circle fills roughly 90% of it. All existing props and interactions are
unchanged; the fit never moves the view for draft edits, marker drags, pan/zoom, or refreshes.

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `center` | `Center` | yes | The selected center point, rendered as the draggable center marker. |
| `radiusKm` | `number` | yes | The selected radius in kilometers; renders the circle and edge marker. |
| `aircraft` | `Aircraft[]` | no | Aircraft from the current result, rendered as read-only markers. Default `[]`. |
| `fitRequest` | `LocationQuery \| null` | no | The submitted selection to fit the view to. When present on mount, or when it changes to a new value, the map animates to center on it with the circle filling most of the frame. When absent (`null`) or unchanged, the view is never moved. Default `null`. |
| `onFitApplied` | `(query: LocationQuery) => void` | no | Called with the `fitRequest` value immediately after the map view has moved to it. Lets the owner stop treating the request as pending, so a later map remount (mode switch) does not refit an already-fitted query. |
| `onCenterChange` | `(center: Center) => void` | yes | Called with the new center when the center marker is dragged. |
| `onRadiusChange` | `(radiusKm: number) => void` | yes | Called with the recomputed radius when the edge marker is dragged. |

`Center` and `LocationQuery` come from `api/types.ts` (`{ lat, lng }` / `{ lat, lng, radiusKm }`).

## Behavior

- Renders the `MapContainer`, OSM tiles, the radius circle, the two draggable selection markers,
  the aircraft markers with callsign tooltips, and the docked cards — all unchanged.
- **Fit on submit** (spec FR-001, FR-002): a child `MapFitController` (internal) uses the map
  instance and calls `flyToBounds` with the selection circle's bounding box corners inflated by
  3% and `maxZoom: 19`, so the submitted center is centered and the circle fills most of the
  frame, fully visible. The bounds come from `circleBounds(center, radiusKm)` (`lib/location.ts`).
- **Fit timing** (spec FR-003, FR-004): the fit applies when `fitRequest` is present on mount (a
  submit made in list mode) or when `fitRequest` changes (a new submit). After each fit the
  controller reports the applied request through `onFitApplied`, so the owner can clear the pending
  request and an unchanged `fitRequest` on remount/rerender never refits.
- **No fit on edits/navigation** (spec FR-005): changes to `center`/`radiusKm` (draft edits,
  marker drags), user pan/zoom, and refreshes of the same submitted query never trigger a fit.
- **Radius extremes** (spec FR-006): `maxZoom: 19` matches the OSM tile ceiling so even the
  smallest allowed radius (0.1 km) fills the frame; the largest radius (463 km) fits with the
  standard margin.
- **Map failure** (spec FR-007): the existing `MapErrorBoundary` fallback is unaffected; no fit is
  attempted when the map cannot load.
- **Backward compatibility**: existing consumers that pass no `fitRequest` see no behavioral change
  (the previous fixed zoom-10 initial view).

## Example (JSX)

```tsx
<FlyOverMap
  center={draft}
  radiusKm={draft.radiusKm}
  fitRequest={query}
  aircraft={result?.aircraft ?? []}
  onCenterChange={handleDraftChange}
  onRadiusChange={(r) => handleDraftChange({ ...draft, radiusKm: r })}
/>
```

## Acceptance

- With `fitRequest` provided on mount, the map's `flyToBounds` is called once with the circle's
  padded bounds and `maxZoom: 19`.
- When `fitRequest` changes to a new value, `flyToBounds` is called again with the new bounds.
- When only `center`/`radiusKm` change, or when `fitRequest` is unchanged across rerenders, no
  `flyToBounds` call occurs.
- The fitted bounds enclose the full circle (any destination point at `radiusKm` lies within the
  box) and center on the submitted point.
- The map still renders the circle, selection markers, aircraft, and cards with the existing drag
  behavior unchanged.