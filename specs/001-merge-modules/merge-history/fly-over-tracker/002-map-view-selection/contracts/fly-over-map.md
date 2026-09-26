# Contract: Frontend Component — FlyOverMap

**Interface**: React component (frontend package, exported from `components/index.ts`)
**Domain**: `fly-over-map` | **Stories**: `FlyOverMap.stories.tsx`

## Purpose

Renders the fly-over query and results on an interactive map (spec FR-002): the queried center
and radius, the aircraft from the current result at their reported positions, and a **full
location-selection control** — a draggable center marker and a draggable edge marker that resizes
the radius circle (spec FR-005). Panning and zooming are always free and never change the
selection (spec FR-008/FR-009).

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `center` | `{ lat: number; lng: number }` | yes | The selected center point, rendered as the draggable marker. |
| `radiusKm` | `number` | yes | The selected radius in kilometers; renders the circle and the edge marker. |
| `aircraft` | `Aircraft[]` | no | Aircraft from the current `FlyOverResult` to render as read-only markers. Defaults to `[]`. |
| `onCenterChange` | `(center: { lat: number; lng: number }) => void` | yes | Called on center-marker drag end with the new `lat`/`lng`. |
| `onRadiusChange` | `(radiusKm: number) => void` | yes | Called on edge-marker drag end with the recomputed radius. |

Shared types (`Aircraft`) come from `api/types.ts` (no new wire types).

## Behavior

- **Map**: embedded interactive map with base tiles (OpenStreetMap); pan and zoom controls are
  enabled and have no effect on the selection or query.
- **Center marker**: draggable; on drag end calls `onCenterChange` with the marker's new
  `(lat, lng)`, clamped to valid coordinate ranges (spec FR-011).
- **Edge marker**: positioned on the circle at `radiusKm` from the center; draggable; on drag end
  computes `radiusKm = haversine(center, edge)` (clamped to `(0, MAX_RADIUS_KM]`) and calls
  `onRadiusChange` (spec FR-005). Dragging it is the "drag the circle edge" interaction.
- **Radius circle**: rendered from `center` + `radiusKm`; its edge marker is the resize handle.
- **Aircraft markers**: one read-only marker per aircraft at `(latitude, longitude)`, rendered with
  a custom plane icon rotated to the aircraft's `trueTrack`; never draggable. Each marker shows an
  always-visible callsign label. An always-visible horizontal card per aircraft (plane glyph,
  callsign, and emoji-tagged origin/destination/altitude/speed/heading/distance) is docked below
  the map.
- **Controlled**: the component does not own the selection; it renders from props and reports
  changes via callbacks. The owner updates the shared location draft (spec FR-006/FR-007).

## Example (JSX)

```tsx
<FlyOverMap
  center={{ lat: 48.8566, lng: 2.3522 }}
  radiusKm={50}
  aircraft={result.aircraft}
  onCenterChange={(c) => update({ ...draft, ...c })}
  onRadiusChange={(r) => update({ ...draft, radiusKm: r })}
/>
```

## Acceptance

- Renders the center marker, radius circle, edge marker, and aircraft markers for the given
  props.
- Dragging the center marker reports the new center and does not change the radius.
- Dragging the edge marker reports a new radius (the distance between center and edge) and does
  not change the center.
- Panning and zooming do not call `onCenterChange`/`onRadiusChange` and do not re-render the
  markers at new positions (spec FR-008/FR-009).
- Aircraft markers are read-only, use a plane icon rotated by `trueTrack`, show an always-visible
  callsign label, and are accompanied by an always-visible docked panel of horizontal aircraft
  cards.
- Rejected/clamped values never reach the owner; valid inputs always produce consistent output.