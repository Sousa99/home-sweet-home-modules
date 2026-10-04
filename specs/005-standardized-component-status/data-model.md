# Data Model: Standardized Component Status

**Feature**: `005-standardized-component-status` | **Date**: 2026-10-04

The feature introduces **no persistence**. The entities below are the runtime state that
each data-fetching widget maintains in memory and feeds into the shared status bar. The
"contract" between widget and bar is defined in [`contracts/status-bar.md`](./contracts/status-bar.md).

## Entity: LastUpdateTimestamp

Represents the moment a widget's data was last successfully loaded. It is the single
source of truth for the "Last updated" value.

| Field | Type | Rules |
|-------|------|-------|
| `timestamp` | number (epoch millis) \| null | `null` when the widget has never successfully loaded. Never fabricated: only set on a **successful** load (manual or automatic). |

**Transitions**:

- `null` → `<t>` : first successful load.
- `<t1>` → `<t2>` : a later load succeeds; advances on every successful load (FR-005).
- `<t1>` → `<t1>` (unchanged) : a load fails — the previous timestamp is preserved and the
  failure is surfaced (FR-006).

## Entity: WidgetLoadState

The current data activity of a widget. It drives the status bar's `updating`, `error`,
and `lastUpdatedAt` props.

| State | Meaning | Status bar effect |
|-------|---------|-------------------|
| `no-data` (initial/loading) | First load in flight; nothing loaded yet | `lastUpdatedAt = null` (shows "Not updated yet"), `updating = true` |
| `ready` | Data loaded successfully | `lastUpdatedAt = <t>`, `updating = false`, no error |
| `updating` (ready + load in flight) | A refresh is running over existing data | `lastUpdatedAt = <t>` kept, `updating = true` |
| `error` | The latest load failed | previous `lastUpdatedAt` (if any) kept, `error` set, `updating = false` |

**Rules**:

- A Refresh pressed while a load is already in flight must not start a conflicting
  duplicate load (FR-002 edge case).
- Every successful load — manual or automatic — advances `lastUpdatedAt` (FR-009).
- While `updating`, the Refresh control is disabled and the updating indicator is shown.

## Per-widget mapping

### fly-over-tracker (5 published widgets) — TanStack Query

`useFlyOversQuery` exposes (after extension): `dataUpdatedAt`, `isFetching`, `isError`,
`error`, `refetch`.

| Widget prop | Source |
|-------------|--------|
| `lastUpdatedAt` | `dataUpdatedAt` (`null` while never loaded) |
| `updating` | `isFetching` |
| `error` | `error?.message` when `isError`, else `null` |
| `onRefresh` | `refetch` |

Widgets: `FlyOverWidget`, `FlyOverMapCard`, `FlyOverListCard`, `FlyOverClosestPanel`,
`ClosestAircraftCard`. The prior count/status header line is replaced by the shared bar;
`RefreshRateSelect` auto-refresh stays.

### bus-catcher (1 published widget) — hand-rolled loader

`StopCard`'s `LoadState` gains `lastUpdatedAt: number` on `ready`, an in-flight flag, and
a refresh action that re-runs the current `load()` immediately (the existing
`refetchIntervalMs` polling stays).

| Widget prop | Source |
|-------------|--------|
| `lastUpdatedAt` | `state.kind === 'ready' ? state.lastUpdatedAt : null` |
| `updating` | in-flight flag |
| `error` | message on `error` state, else `null` |
| `onRefresh` | immediate re-load |

### procrastinator-tracker (2 published components) — hand-rolled loader

`TaskDeckWrapper` (the data-fetching entry) gains `lastUpdatedAt` on `success`, an
in-flight flag, and uses its existing `load` as `onRefresh`. `TaskDeck`/`TaskDeckCard`
are controlled display components and are **exempt** (Q1).

| Widget prop | Source |
|-------------|--------|
| `lastUpdatedAt` | `state.kind === 'success' ? state.lastUpdatedAt : null` |
| `updating` | in-flight flag |
| `error` | `state.kind === 'error' ? state.message : null` |
| `onRefresh` | `load` |

## Exempt entities

The clock family (`ClockCard`, `ClockPlain`, `ClockFace`, `TimeFormatToggle`) and the
controlled `TaskDeck`/`TaskDeckCard` are presentational/live components with no data load;
they are out of scope and unchanged (FR-010).