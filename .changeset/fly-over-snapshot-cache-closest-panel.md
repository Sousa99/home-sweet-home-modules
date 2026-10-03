---
"@sousa99/fly-over-tracker-components": minor
---

- **Backend**: cache feed snapshots per location (`SNAPSHOT_CACHE_TTL_MS`, default 10 s) so
  overlapping widget/MCP queries coalesce onto one adsb.lol call instead of hitting the
  upstream rate limit.
- **Frontend**: new `FlyOverClosestPanel` widget — closest aircraft as a prominent tile
  plus the remaining aircraft as a list (the closest is not repeated), with an optional
  `maxResults` cap. `AircraftMapView` now keeps Leaflet's viewport in sync via
  `invalidateSize` on resize and retries failed tiles, so the map renders fully.