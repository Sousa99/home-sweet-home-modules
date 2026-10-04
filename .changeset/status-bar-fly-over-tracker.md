---
"@sousa99/fly-over-tracker-components": patch
---

The five published dashboard widgets now render the standardized `WidgetStatusBar`
(last-update time, updating indicator, manual Refresh, failure notice) in place of the
previous count/status header. The widget hooks expose `dataUpdatedAt` for the last
successful load; the `UpdatingIndicator` component was removed.