# Research — Center Map on Selection Submit

**Feature**: specs/005-map-center-on-submit | **Phase 0 output**
**Date**: 2026-09-22

All unknowns in the Technical Context were resolved by codebase inspection and established
react-leaflet/Leaflet behavior; no external research dependency remains.

## 1. Fit trigger: reuse the submitted query as the fit request

**Decision**: Add a `fitRequest?: LocationQuery | null` prop to `FlyOverMap`. `App` passes the last
submitted query (`query`) as `fitRequest`. The map fits when `fitRequest` is present on mount or
changes to a new value.

**Rationale**: The submitted `LocationQuery` (center + radius) is exactly the geometry the fit
needs, and `query` in `App.tsx` only changes on submit (`handleSubmit`, `App.tsx:66-69`). Keying
the fit on `query` automatically satisfies every timing requirement from the spec with no extra
state machine:
- Submit in map mode → `query` changes → the mounted `MapFitController` refits (FR-001, FR-002).
- Submit in list mode → the map is not mounted; the change is recorded only in `query`. On first
  map mount the controller sees the pending `fitRequest` and fits (FR-003).
- List↔map switching without a new submit → the fit is already applied → `fitRequest` is null →
  no refit (FR-004).
- Draft edits, marker drags, pan/zoom, refresh → none touch `query` → the view never moves (FR-005).

**Fitted tracking**: the "already applied" knowledge must survive map unmount/remount, so `App`
keeps a small `fittedQuery` state. `pendingFit = query !== null && (fittedQuery === null ||
!queriesEqual(query, fittedQuery))` is passed as `fitRequest = pendingFit ? query : null`. When the
controller applies a fit it reports it through `onFitApplied` (→ `setFittedQuery`), which clears
the pending state and prevents a refit on any later map mount.

**Validation**: The submitted query is already validated by the form (`validate()` +
`clampRadiusKm`) before it becomes `query`, so the fit input is always within the valid lat/lng
range and radius bounds `[0.1, 463]` km.

**Alternatives considered**:
- A dedicated monotonically increasing "fit token" counter prop — rejected: `query` already
  identifies each submission unambiguously and carries the geometry; an extra counter adds state
  for no benefit.
- Fitting on every `center`/`radiusKm` change — rejected: that fires on draft edits and marker
  drags, violating FR-005 (the map would jump while the user drags).
- Marking the query fitted via an `App` effect on `mode === 'map'` (no `onFitApplied` callback) —
  rejected: it relies on React's child-before-parent effect ordering to run after the controller's
  fit; the explicit callback is robust to ordering and directly testable.

## 2. Fit mechanics: `useMap` + `flyToBounds` on padded circle bounds

**Decision**: Render a `MapFitController` child inside `MapContainer` that calls react-leaflet's
`useMap()` and, when a fit is due, computes the circle's bounding box via `circleBounds` and calls
`map.flyToBounds(corners, { maxZoom: 19 })`, where `corners` is the SW/NE box inflated by 3% in
pure math (no Leaflet `LatLngBounds` needed — a corner array is a valid `LatLngBoundsExpression`).

**Rationale**: `useMap()` is react-leaflet's supported way to reach the map instance from inside
`MapContainer`. `flyToBounds` animates (smooth transition) and falls back to an instant jump where
animation is unsupported — both satisfy the spec's "the map animates" acceptance language and the
"animation may be animated or instant" assumption. Inflating the box corners by 3% yields a
roughly constant ~3% margin on each side regardless of radius — the circle then fills ~94% of
the frame, matching "almost all the map frame". `maxZoom: 19` matches the OSM tile layer ceiling
(the TileLayer default of 18 would otherwise clamp small-radius fits below a frame-filling zoom,
making the circle stay small and appear not to change with the radius).

**Validation**: Bounds come from the new pure `circleBounds` helper (decision 3). The 3% padding
ratio and `maxZoom` are single constants, unit-assertable in the component tests.

**Alternatives considered**:
- `map.fitBounds` (instant) as the primary call — rejected in favor of `flyToBounds` for the
  smoother UX; `fitBounds` remains the documented fallback if animation is not desired.
- Fitting via the `center`/`zoom` props of `MapContainer` — rejected: react-leaflet's
  `MapContainer` props are initial-only and do not react to changes (`FlyOverMap.tsx:70-75`), so
  this would require a remount and would fight user pan/zoom.
- Negative padding to force the circle to the frame edge — rejected: it can clip the circle on
  non-square frames; a positive 3% margin keeps the full circle visible as the spec requires.

## 3. Bounds geometry: pure `circleBounds` helper

**Decision**: Add `circleBounds(center: LatLng, radiusKm: number): { southwest: LatLng; northeast:
LatLng }` to `frontend/src/lib/location.ts`, built from the four cardinal extents computed with the
existing `destPoint` helper (`location.ts:74`): north at 0°, east at 90°, south at 180°, west at
270°. The box corners are `southwest = { lat: south.lat, lng: west.lng }` and `northeast = { lat:
north.lat, lng: east.lng }`.

**Rationale**: A bounding box built from the circle's cardinal extents is exactly what
`LatLngBounds` needs and what `fitBounds`/`flyToBounds` consume, and it truly encloses the whole
circle: the north/south extents bound latitude and the east/west extents bound longitude, so every
destination point at `radiusKm` lies within the box and the center is the box midpoint. Reusing
`destPoint` keeps the great-circle math in one place and makes the geometry a pure function
testable without Leaflet or a DOM (unit tests in `location.test.ts`). A SW/NE diagonal pair
(bearings 225°/45°) was initially considered but rejected: it does **not** enclose the circle —
the bearing-0 (north) point falls above the box's northeast corner, which would clip the circle
during a map fit.

**Validation**: `southwest` and `northeast` enclose the circle: for any bearing, the destination
point at `radiusKm` from `center` lies within the returned box. Unit tests assert this for
bearings 0/45/90/135/180/225/270/315, that `center` is the box midpoint, and that small/typical/
maximum radii produce correct boxes.

**Alternatives considered**:
- Computing bounds inline in the component — rejected: untestable in jsdom and duplicates math
  already available via `destPoint`.
- Using a rendered `Circle`'s `getBounds()` — rejected: requires a real Leaflet layer in a
  browser; the pure helper is simpler and synchronous.
- SW/NE diagonal pair via `destPoint` at 225°/45° — rejected: does not enclose the circle (north
  extent exceeds the box), which would clip it during a fit.

## 4. Test strategy: extend the react-leaflet mock with `useMap`

**Decision**: Extend `frontend/src/test/react-leaflet-mock.tsx` with a `useMap` hook that returns a
fake map instance (recorded in a `mapStore`) exposing `flyToBounds`, `getSize`, and `getCenter`
with recorded calls, mirroring the existing `markerStore` pattern for markers.

**Rationale**: jsdom has no real Leaflet map, and `MapContainer` is already mocked
(`src/test/setup.ts` wires `vi.mock('react-leaflet', ...)`). A recorded fake lets tests assert the
fit behavior deterministically: whether `flyToBounds` was called, with what bounds/options, and on
which render. `getSize()` is included so a future pixel-based padding choice stays testable.

**Validation**: `FlyOverMap.test.tsx` asserts no `flyToBounds` call before a `fitRequest` is
provided, one call when `fitRequest` is present on mount, a new call when `fitRequest` changes, and
no call when `center`/`radiusKm` change without `fitRequest`. `App.test.tsx` covers the
mode-dependent scenarios.

**Alternatives considered**:
- Rendering real Leaflet in jsdom — rejected: the existing mock is the established pattern; real
  tiles/CSS are unavailable in jsdom.
- Spying on `map.flyToBounds` via a test-only module — rejected: the shared mock store is the
  consistent, already-shipped approach in this codebase.

## 5. Component contract and exposure

**Decision**: `FlyOverMap` gains an optional `fitRequest` prop; its other props are unchanged, and
no export changes in `components/index.ts`. A Storybook story (`FitOnSubmit`) demos the behavior by
passing a `fitRequest` with aircraft.

**Rationale**: Keeps the map component presentational and dependency-free (the fit is driven
entirely by props), matches the components-first convention, and lets the SPA own the "when to fit"
decision while the component owns the "how to fit" mechanics.

**Alternatives considered**:
- Fitting from `App` via a ref — rejected: leaks Leaflet internals upward and bypasses the
  components-first convention.

## Consolidated decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | `fitRequest` = last submitted `query`; fit on mount or on `fitRequest` change | `query` changes only on submit; zero extra state; satisfies all fit-timing requirements |
| 2 | `useMap()` + `map.flyToBounds(corners, { maxZoom: 19 })` with corners inflated by 3% | animated fit; ~3% margin fills ~94% of the frame; maxZoom matches the OSM z19 tile ceiling |
| 3 | Pure `circleBounds(center, radiusKm)` via `destPoint` at cardinal extents (N/E/S/W) | testable geometry without Leaflet/DOM; truly encloses the circle; reuses existing math |
| 4 | Extend react-leaflet mock with recorded `useMap` fake | deterministic fit assertions in jsdom; consistent with `markerStore` |
| 5 | `FlyOverMap` gains optional `fitRequest` prop; story added | presentational component; components-first convention |