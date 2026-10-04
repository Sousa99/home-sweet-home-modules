# Data Model: Status Bar Placement Outside the Card

**Feature**: `008-status-bar-placement` | **Date**: 2026-10-04

The feature introduces **no persistence** and no backend data changes. The "entities" below are the
runtime **render layout** of the published `StopCard` widget — the structure that governs where the
status bar sits relative to the card. The public component contract is defined in
[`contracts/stop-card-layout.md`](./contracts/stop-card-layout.md).

## Entity: WidgetLayout

The root container of the published `StopCard`. It groups the status bar and the card into one
block, so the two travel together and stay aligned in any host layout (SPA stack, Storybook, embeds).

| Field | Type | Value / Rules |
|-------|------|---------------|
| `rootElement` | element | A `<div>` wrapping the entire widget. It is the single mount point of the widget's render (FR-001). |
| `testId` | string | `stop-card-widget` — stable hook used by tests to locate the root (see [`research.md`](./research.md) R2). |
| `gap` | CSS spacing | `space-y-2` between the status bar and the card — a small, even gap so the card's border/background never touches the bar (FR-003). |
| `childOrder` | order | `children[0]` = status bar, `children[1]` = card. Immutable ordering (FR-001, FR-004). |

**Rules**: Every `StopCard` render — loading, ready, error, missing — produces this exact structure.
The order of children must never change, so the bar is always directly above the card.

## Entity: StatusBarPlacement

The relationship between a widget and its status bar that this feature establishes.

| Field | Type | Rules |
|-------|------|-------|
| `barPosition` | `'above-card'` | The `WidgetStatusBar` is the first child of `WidgetLayout`, fully **outside** the card element's boundary (FR-001). |
| `insideCard` | boolean | Always `false`: the card element must not contain the bar or any of its text (`Last updated`, `Not updated yet`, `Refresh`, `Updating…`) (FR-002). |
| `cardWidth` | width alignment | The bar spans the same width as its card — both are block-level children of the same root (FR-004). |

**Transition**: `insideCard` flips `true → false` exactly once, when the render restructure lands.
After that the placement is static — there is no runtime state; this entity is a render invariant
locked by tests.

## Entity: StatusBarProps (unchanged, from 005)

The bar keeps receiving the same props derived from `StopCard`'s existing `LoadState` and in-flight
flag. Nothing about these inputs changes:

| Widget prop | Source (unchanged) |
|-------------|--------------------|
| `lastUpdatedAt` | `state.status === 'error' \|\| 'ready' ? state.lastUpdatedAt : null` |
| `updating` | the in-flight flag |
| `error` | `'Stop not found in the current schedule.'` on error, else `null` |
| `onRefresh` | immediate re-load; `undefined` when `missing` |

See `contracts/status-bar.md` (005) for the bar's own render contract.

## Unchanged entities

- `LoadState`, the fetch/polling/refresh logic, `api` client, `ui/card` primitives, and
  `DashboardPage` are untouched by this feature.
- The shared `WidgetStatusBar` and `formatLastUpdated` in `@sousa99/homesweethome-components` are
  untouched (FR-005).