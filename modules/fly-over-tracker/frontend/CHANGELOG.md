# @sousa99/fly-over-tracker-components

## 0.4.1

### Patch Changes

- fae70e7: Make the `debug` map diagnostics human-readable in production bundles: log the container
  size as `WxH`, the center as `lat,lng`, add a `tiles.requested` count (via
  `tileloadstart`) and a post-fit `fitted` line — so it is clear whether tiles are never
  requested or failing to load.

## 0.4.0

### Minor Changes

- c0807b1: Fix the map loading only some tiles when hosted in a CSS grid/flex layout: the auto-fit now
  waits for a real container size and re-fits when the container resizes, so Leaflet always
  requests tiles for the full rendered area. Add a `tileUrl` prop to override the default
  OpenStreetMap basemap and a `debug` prop that logs the measured container size, zoom,
  re-fits, and tile load/error totals to the console (`[fly-over-map]`).

## 0.3.1

### Patch Changes

- 177ea63: Fix the map loading only some tiles: the public OSM tile server throttles tile bursts
  (which the auto-fit zoom animation triggers), leaving random tiles blank while zooming.
  Switch the default basemap to the CartoDB Voyager streets tiles and retry failed or
  rate-limited tiles with a growing backoff. The auto-fit behaviour is unchanged.

## 0.3.0

### Minor Changes

- 2847331: - **Backend**: cache feed snapshots per location (`SNAPSHOT_CACHE_TTL_MS`, default 10 s) so
  overlapping widget/MCP queries coalesce onto one adsb.lol call instead of hitting the
  upstream rate limit.
  - **Frontend**: new `FlyOverClosestPanel` widget — closest aircraft as a prominent tile
    plus the remaining aircraft as a list (the closest is not repeated), with an optional
    `maxResults` cap. `AircraftMapView` now keeps Leaflet's viewport in sync via
    `invalidateSize` on resize and retries failed tiles, so the map renders fully.

## 0.2.0

### Minor Changes

- 8da9913: Add `FlyOverMapCard` (map only) and `FlyOverListCard` (list only, with an optional
  `maxResults` cap) so a host dashboard can place the map and the aircraft list
  independently. `FlyOverWidget` also gains an optional `maxResults` prop to cap its list.

## 0.1.1

### Patch Changes

- d44821b: Fix the published component libraries: the release pipeline now builds `dist-lib` before publishing
  and CI verifies the tarball contents (`scripts/check-publishable-libs.mjs`). Previous releases
  shipped empty packages (only `package.json`), so consumers could not import any widget.

## 0.1.0

### Minor Changes

- c21181d: Standardize local setup: the published `FlyOverWidget` and `ClosestAircraftCard`
  resolve their `baseUrl` default from runtime config (`/config.json`, `API_BASE_URL`)
  while keeping the explicit prop, and the backend REST port is standardized on `PORT`
  (`HTTP_PORT` kept as a backward-compatible alias). Container (backend/frontend/storybook)
  and nginx deployment files updated.
