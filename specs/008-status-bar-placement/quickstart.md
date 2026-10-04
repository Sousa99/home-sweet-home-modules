# Quickstart: Validating the Status Bar Placement

**Feature**: `008-status-bar-placement` | **Date**: 2026-10-04

This guide proves the feature works end-to-end. It is a validation/run guide — full implementation
lives in `tasks.md` and the implementation phase.

## Prerequisites

- pnpm 11 + Node 24, repo installed (`pnpm install`).
- The bus-catcher frontend package exists as described in [`plan.md`](./plan.md), with placement
  tests written first (red → green).

## What is validated

| # | Scenario | Proves |
|---|----------|--------|
| 1 | Component placement tests pass | The status bar renders above and outside the card; the card interior has no status text ([`contracts/stop-card-layout.md`](./contracts/stop-card-layout.md)) |
| 2 | Existing status-bar behavior tests still pass | Behavior unchanged (FR-005) — no regression in the 005 contract |
| 3 | Multi-widget attribution test + Storybook | Each card keeps its own bar above it (FR-006) |
| 4 | SPA end-to-end | The dashboard stack shows each widget with its bar above the card |
| 5 | Public surface check | No export or prop change |

## Commands

### 1. Component tests — placement

```bash
pnpm --filter ./modules/bus-catcher/frontend test
pnpm --filter ./modules/bus-catcher/frontend typecheck
```

**Expected**: `src/components/StopCard.test.tsx` passes including the new cases — the status bar is
a descendant of the widget root's first child, the card (`closest('.rounded-xl')` from the stop-name
heading) is a descendant of the second child, `card.contains(statusText) === false`, the card
interior's text contains no `Last updated` / `Not updated yet` / `Refresh` / `Updating…`, and two
rendered widgets each expose a bar above their own card.

### 2. Existing behavior tests still pass

Same command — every pre-existing assertion (status bar `Last updated` regex, `Not updated yet`,
Refresh advances the timestamp, `Updating…` indicator, error preserves the timestamp + `role="alert"`,
recovery via Refresh, missing state, polling interval) passes **unchanged**. None depend on the bar
being inside the card.

### 3. Storybook visual check

```bash
pnpm --filter ./modules/bus-catcher/frontend storybook   # :6006
```

Open `Components/StopCard`:

- **Default / Schedule only / Empty / Loading / Error / Missing**: in every story the status bar sits
  directly above the card, outside its border, aligned to the card's width — the card itself shows
  only stop content.
- **Multi-widget story** (e.g. two stops): each card has its own bar above it; the two bars don't
  merge or drift.
- **Urgency stories**: the colored dots inside the card rows are unchanged.

### 4. SPA end-to-end

```bash
pnpm --filter ./modules/bus-catcher/backend dev          # REST on :3000
pnpm --filter ./modules/bus-catcher/frontend dev         # SPA on :5173
```

With one or more stops configured on the Config tab: the Dashboard stacks the widgets (existing
`space-y-4`), and each widget shows its status bar above its card. Press **Refresh** on one bar —
only that card's bar updates (FR-006); the card's border/background never touches the bar (FR-003).

### 5. Public surface check (SC-004, spec Assumptions)

```bash
pnpm --filter ./modules/bus-catcher/frontend build:lib
```

Inspect `dist-lib/index.d.ts`: `StopCard`, `StopCardProps`, and `FetchStopTimes` are intact with
their existing props — nothing added, removed, or renamed.

## Gate run (before any PR)

```bash
pnpm lint && pnpm format && pnpm typecheck && pnpm test
```

**Expected**: all four gates green across the workspace, including the bus-catcher frontend package.