---
"@sousa99/fly-over-tracker-components": patch
---

Fix the map's auto-fit being canceled mid-animation: `invalidateSize` no longer runs while
the fit is in flight (it stopped Leaflet's `flyToBounds`, leaving a sparse, unfitted tile
grid). The fit now settles fully and then re-syncs the tile grid; resize re-fits are
deferred until the animation completes. Debug tile counters are attached before the
initial load so `requested`/`loaded` are accurate.