---
"@sousa99/procrastinator-tracker-components": patch
---

`TaskDeckWrapper` now renders the standardized `WidgetStatusBar` above the deck:
`Last updated {HH:MM:SS}` (or `Not updated yet` before the first load), an `Updating…`
indicator while loading, a manual `Refresh` button that reloads the deck, and a failure
notice that keeps the last successful time (polling is unchanged).