# Contract: Shared Status Bar

**Feature**: `005-standardized-component-status` | **Date**: 2026-10-04

The only new public interface introduced by this feature is the shared status bar package
`@sousa99/homesweethome-components`. It is a **UI contract**: the published export surface
of the shared component and its render/behavior guarantees.

> The shared package is internal and never published (see
> [`research.md`](../research.md) §2). Its contract is consumed by the modules' published
> widget packages, which bundle it into their own `dist-lib`.

## Package surface

```ts
// packages/components/src/index.ts
export { WidgetStatusBar } from './WidgetStatusBar';
export type { WidgetStatusBarProps } from './WidgetStatusBar';
export { formatLastUpdated } from './formatLastUpdated';
```

No other symbols are part of the public surface. `WidgetStatusBar` and
`formatLastUpdated` are the entire API.

## `WidgetStatusBarProps`

| Prop | Type | Required | Default | Contract |
|------|------|----------|---------|----------|
| `lastUpdatedAt` | `number \| null` | yes | — | Local time (epoch millis) of the last **successful** data load; `null` = never loaded. Never fabricated. |
| `updating` | `boolean` | no | `false` | True while a load is in flight → show the updating indicator and disable the Refresh control. |
| `error` | `string \| null` | no | `null` | Non-null → surface a failure notice in the status area. Does not clear `lastUpdatedAt`. |
| `onRefresh` | `() => void` | no | — | Invoked when the Refresh control is pressed. |
| `className` | `string` | no | — | Extra classes applied to the status bar root. |

## Render contract

The status bar renders a single row containing (in order):

1. **Last-updated status**: text `Last updated {YYYY-MM-DD HH:MM:SS <zone>}` (device-local,
   full timestamp: date, 24-hour time, and timezone) when `lastUpdatedAt` is set;
   `Not updated yet` when `null`. Served as the primary status on the left.
2. **Right-aligned controls**: the updating indicator and the Refresh control are grouped
   and aligned to the right (`ml-auto`):
   - **Updating indicator**: a small spinner + `Updating…` chip rendered **only** while
     `updating` is true; absent otherwise.
   - **Refresh control**: a button labelled `Refresh` that calls `onRefresh`. Disabled
     while `updating` (no duplicate concurrent loads).
3. **Failure notice**: when `error` is non-null, an error message is surfaced in the
   status area (e.g. a red-role alert). It does not replace the `Last updated` value or
   the Refresh control — the user can retry.

### Identical-by-construction guarantee (FR-004)

Wording (`Last updated`, `Not updated yet`, `Updating…`, `Refresh`), the full-timestamp
format, the right-aligned controls, and behavior are defined once in this component. All
widgets render the exact same bar; no per-module overrides or alternate markup are
permitted.

## Accessibility contract (FR-008)

- The last-updated status and the updating indicator each live in a polite live region
  (`role="status"`, `aria-live="polite"`), so assistive tech announces both the timestamp
  and updates.
- The Refresh control is a real `<button>` with an accessible name (`Refresh`).
- The failure notice uses `role="alert"` so failures are announced promptly.
- The updating indicator has an accessible label (`Updating…`) and is hidden from
  non-sighted AT only while idle.

## `formatLastUpdated`

`formatLastUpdated(timestamp: number | null): string`

- `null` → `"Not updated yet"`.
- a number → the device-local full timestamp rendered as `YYYY-MM-DD HH:MM:SS <zone>`
  (24-hour, zero-padded), e.g. `2026-10-04 14:32:05 GMT+1`. The zone is the short local
  timezone name (e.g. `GMT+1`), with a `UTC±HH:MM` fallback if no name is available.

Pure function; unit-tested in the shared package.

## Integration contract (per widget)

Each published data-fetching widget composes `WidgetStatusBar` with props derived from its
own load state (see [`data-model.md`](../data-model.md)). The widget's existing public
props are unchanged — `WidgetStatusBar` is internal to each widget's render. Widgets keep
their existing auto-refresh controls (FR-009).

Widgets that receive `WidgetStatusBar`:

- fly-over-tracker: `FlyOverWidget`, `FlyOverMapCard`, `FlyOverListCard`,
  `FlyOverClosestPanel`, `ClosestAircraftCard`.
- bus-catcher: `StopCard`.
- procrastinator-tracker: `TaskDeckWrapper`.

Exempt (Q1, FR-010): current-time clock family, `TimeFormatToggle`,
`TaskDeck`, `TaskDeckCard`.

## Validation

- Shared package tests lock the props contract and render/behavior guarantees
  (`WidgetStatusBar.test.tsx`, `formatLastUpdated.test.ts`).
- Per-module widget tests assert the standardized status area renders in each published
  widget with the correct `lastUpdatedAt`/`updating`/`error`/refresh wiring.