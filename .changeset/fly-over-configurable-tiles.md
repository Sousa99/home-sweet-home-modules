---
"@sousa99/fly-over-tracker-components": minor
---

Fix the map loading only some tiles when hosted in a CSS grid/flex layout: the auto-fit now
waits for a real container size and re-fits when the container resizes, so Leaflet always
requests tiles for the full rendered area. Add a `tileUrl` prop to override the default
OpenStreetMap basemap and a `debug` prop that logs the measured container size, zoom,
re-fits, and tile load/error totals to the console (`[fly-over-map]`).