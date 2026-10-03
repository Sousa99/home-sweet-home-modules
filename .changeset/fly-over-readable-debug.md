---
"@sousa99/fly-over-tracker-components": patch
---

Make the `debug` map diagnostics human-readable in production bundles: log the container
size as `WxH`, the center as `lat,lng`, add a `tiles.requested` count (via
`tileloadstart`) and a post-fit `fitted` line — so it is clear whether tiles are never
requested or failing to load.