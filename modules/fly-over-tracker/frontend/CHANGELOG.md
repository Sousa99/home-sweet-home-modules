# @sousa99/fly-over-tracker-components

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
