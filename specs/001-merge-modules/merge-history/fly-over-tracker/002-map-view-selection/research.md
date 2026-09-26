# Research: Map View & Selection

Phase 0 output for `specs/002-map-view-selection`. Every decision is recorded with its rationale
and the alternatives considered. No `NEEDS CLARIFICATION` items remained after planning; the two
user decisions (full map control for center and radius; explicit submit triggers the query) are
reflected in the decisions below.

---

## Decision 1: Map library — Leaflet + react-leaflet v5

- **Decision**: Use `leaflet` with `react-leaflet@5`, rendering free OpenStreetMap raster tiles
  (`TileLayer`), with no API key or account.
- **Rationale**: `react-leaflet@5.0.0` declares `react ^19` peer support (verified against npm),
  matching the module's React 19 stack exactly. Leaflet is mature, MIT/Hippocratic-licensed,
  keyless, and renders aircraft markers + a draggable radius circle with well-documented APIs.
  The project already commits to free public data sources (OpenSky feed); a keyless map keeps
  that property. `@types/leaflet` is added as a dev dependency for typing.
- **Alternatives considered**:
  - **MapLibre GL JS + `react-map-gl`** — modern vector rendering, but needs a style/tile
    provider decision and carries heavier setup and bundle cost; not needed for simple markers.
  - **Google Maps / Mapbox** — best polish but require API keys, accounts, and paid quotas;
    conflicts with the module's free/open posture.
  - **`@react-leaflet/core`-based custom bindings** — unnecessary; react-leaflet covers the need.

## Decision 2: Radius editing — draggable center + edge markers, no plugin

- **Decision**: The map draws the query circle as a Leaflet `Circle`. The center point is a
  draggable `Marker` (sets lat/lng on drag end). A second draggable `Marker` sits on the circle's
  edge; the radius is the great-circle distance between the two markers
  (`radiusKm = haversine(center, edge)`), recomputed on every edge-marker drag. Dragging the edge
  marker therefore "drags the circle edge", as the user requested (full map control).
- **Rationale**: Delivers center + radius editing on the map using only the two dependencies
  already chosen. The geometry is a pure function in `lib/location.ts` and is unit-testable
  without a map.
- **Alternatives considered**:
  - **`leaflet-editable` plugin (via `react-leaflet-editable`)** — first-class circle-resize
    handles, but adds a dependency and its own React 19/jsdom compatibility surface for marginal
    UX gain; rejected for simplicity (constitution: start simple, YAGNI).
  - **Radius slider in the map panel** — contradicts the user's "full map control" choice.
  - **Fixed radius on the map** — radius would stay input-only; contradicts the user's choice.

## Decision 3: State architecture — single shared location draft in `App`

- **Decision**: Lift the location selection to `App` as a single `LocationQuery`-shaped draft
  (`{ lat, lng, radiusKm }`). `FlyOverForm` becomes a controlled component (`value`/`onChange`/
  `onSubmit`); `FlyOverMap` receives `center`, `radiusKm`, `aircraft`, and
  `onCenterChange`/`onRadiusChange` callbacks. Both render from and write to the same draft, so
  map → inputs and inputs → map consistency (spec FR-006/FR-007) holds by construction. The
  query still runs only on the explicit "Find aircraft" submit, reusing the existing `run()` flow
  in `App` (spec FR-010). View mode is a second piece of `App` state (`ViewMode`).
- **Rationale**: A single source of truth eliminates drift between the two input formats
  (spec FR-012). The change to `FlyOverForm` is backward-compatible for existing consumers
  (library users pass `value`+`onSubmit`); `onChange` is additive.
- **Alternatives considered**:
  - **Independent state per component with a sync effect** — risks feedback loops and drift;
    rejected in favor of one source of truth.
  - **Context/global store** — overkill for a two-component shared value; props are explicit and
    testable.

## Decision 4: Panning/zooming never change the selection

- **Decision**: Only the two markers are draggable. `MapContainer` keeps its default
  `dragging`/`zoomControl` (user pans and zooms freely), and no `moveend` handler mutates the
  selection or re-queries. Markers are positioned from props; pan/zoom only changes the viewport
  (spec FR-008/FR-009).
- **Rationale**: This is Leaflet's default behavior — selection invariance comes for free and is
  asserted in tests by verifying marker positions never update on map move events.
- **Alternatives considered**: intercepting `moveend` to "re-center" the marker on the viewport —
  explicitly rejected; it would break the pannable-without-selection requirement.

## Decision 5: Testing strategy — mock the map, unit-test the geometry

- **Decision**: Component tests mock `react-leaflet` (and `leaflet`) with `vi.mock`, asserting
  the props rendered (marker positions, circle radius, aircraft markers, callbacks) without a
  real DOM map. The pure helpers in `lib/location.ts` (clamp, range validation, haversine,
  center+edge → draft) are unit-tested directly. `App` tests drive the full flow: switch modes,
  simulate map callbacks to update inputs, edit inputs to reposition the (mocked) map, and
  verify submit/refresh behavior. Storybook stories render the real map for manual validation.
- **Rationale**: jsdom cannot run a real Leaflet map; mocking the library keeps tests fast,
  deterministic, and focused on our logic while Storybook covers the real-rendering risk.
- **Alternatives considered**: real-map integration tests with a headless browser — heavy and
  flaky for this scope; deferred.

## Decision 6: Bundling — Leaflet CSS and default marker icons

- **Decision**: Import `leaflet/dist/leaflet.css` where the map mounts, and configure Leaflet's
  default marker icon URLs explicitly (bundle-safe paths) because bundlers break the default
  image URL resolution. Verify both the SPA build (`vite build`) and the library build
  (`vite.lib.config.ts` + `build:css`) still succeed and include the CSS.
- **Rationale**: Without explicit icon URLs the map renders the well-known "missing marker"
  symptom; this is a standard, documented Leaflet + Vite step.
- **Alternatives considered**: bundling the PNG assets and patching
  `L.Icon.Default` at module scope — the standard fix, chosen; custom SVG markers — unnecessary.

## Decision 7: Library package parity

- **Decision**: The new components (`ViewModeToggle`, `FlyOverMap`) are exported from
  `components/index.ts` (and the library entry `src/index.ts` already re-exports the components
  barrel) and receive Storybook stories, keeping the SPA and publishable library on the same
  source per the module's package organization.
- **Rationale**: The module ships a components library; new UI capability is library capability.
  This is how `FlyOverForm`/`FlyOverList` were delivered in feature 001.
- **Alternatives considered**: keeping map components SPA-only — would break the components-first
  convention established by the module.

## Decision 8: Layout for map mode

- **Decision**: The current `max-w-2xl` single-column layout is retained for list mode and the
  form; map mode renders the map in a wider container so markers and the radius circle are
  usable, with the form/toggle above it.
- **Rationale**: A full-width map is required for the drag interactions to be practical; the
  typed form and list stay compact as today.
- **Alternatives considered**: fixed-width map — too cramped for radius dragging; rejected.