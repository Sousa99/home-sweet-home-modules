---
"@sousa99/bus-catcher-components": patch
---

`StopCard` now renders the standardized `WidgetStatusBar` in the card header:
`Last updated {HH:MM:SS}` (or `Not updated yet` before the first load), an `Updating…`
indicator while loading, a manual `Refresh` button that re-runs the current load, and a
failure notice that keeps the last successful time (polling is unchanged).