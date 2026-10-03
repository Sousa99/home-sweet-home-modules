---
"@sousa99/fly-over-tracker-components": patch
---

Fix the map loading only some tiles: the public OSM tile server throttles tile bursts
(which the auto-fit zoom animation triggers), leaving random tiles blank while zooming.
Switch the default basemap to the CartoDB Voyager streets tiles and retry failed or
rate-limited tiles with a growing backoff. The auto-fit behaviour is unchanged.