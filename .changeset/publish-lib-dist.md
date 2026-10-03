---
"@sousa99/bus-catcher-components": patch
"@sousa99/current-time-components": patch
"@sousa99/fly-over-tracker-components": patch
"@sousa99/procrastinator-tracker-components": patch
---

Fix the published component libraries: the release pipeline now builds `dist-lib` before publishing
and CI verifies the tarball contents (`scripts/check-publishable-libs.mjs`). Previous releases
shipped empty packages (only `package.json`), so consumers could not import any widget.