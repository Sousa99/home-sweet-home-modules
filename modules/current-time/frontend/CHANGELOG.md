# @sousa99/current-time-components

## 0.1.1

### Patch Changes

- d44821b: Fix the published component libraries: the release pipeline now builds `dist-lib` before publishing
  and CI verifies the tarball contents (`scripts/check-publishable-libs.mjs`). Previous releases
  shipped empty packages (only `package.json`), so consumers could not import any widget.

## 0.1.0

### Minor Changes

- fcb0a94: Add the frontend-only current-time module: a dashboard-style live clock (hours, minutes,
  seconds) in the shared light amber/slate style. Ships two embeddable widgets — `ClockCard`
  and `ClockPlain` — with identical props (`align`, `defaultFormat`, `switchable`,
  `aspectRatio`) that fill the available space and scale the readout, a persisted 12/24-hour
  format toggle, and a Storybook workbench with a `.mdx` docs page.
