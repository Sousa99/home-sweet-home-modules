---
"@sousa99/fly-over-tracker-components": minor
---

Make the map basemap reliable and configurable: default to Esri World Street Map (the
previous OSM default throttled tile bursts, and CartoDB's anonymous tiles now require an
API key) and add an optional `tileUrl` prop to `FlyOverWidget` and `FlyOverMapCard` so a
host can override the tile provider without another release.