# Quickstart: Validating the Standardized Component Status

**Feature**: `005-standardized-component-status` | **Date**: 2026-10-04

This guide proves the feature works end-to-end. It is a validation/run guide — full
implementation lives in `tasks.md` and the implementation phase.

## Prerequisites

- pnpm 11 + Node 24, repo installed (`pnpm install`).
- The shared package `@sousa99/homesweethome-components` and the integrated widgets exist
  as designed in [`plan.md`](./plan.md), with tests written first (red → green).

## What is validated

| # | Scenario | Proves |
|---|----------|--------|
| 1 | Shared unit tests pass | `WidgetStatusBar` + `formatLastUpdated` contract ([`contracts/status-bar.md`](./contracts/status-bar.md)) |
| 2 | Module test suites pass | Each published data-fetching widget integrates the standardized status area |
| 3 | Manual storybook check per widget | The bar renders identically (wording/layout) and behaves (refresh/indicator) across all widgets |
| 4 | Manual SPA check per module | The bar works with the real backend |
| 5 | Release-surface check | The shared package is not versioned/published; consumers get the bar bundled in each module's `dist-lib` |

## Commands

### 1. Shared package unit tests

```bash
pnpm --filter @sousa99/homesweethome-components test
pnpm --filter @sousa99/homesweethome-components typecheck
```

**Expected**: all tests pass. `formatLastUpdated` covers: `null → "Not updated yet"`,
a timestamp → local `HH:MM:SS` matching the device clock. `WidgetStatusBar` covers: shows
`Last updated {time}`, shows `Not updated yet` when never loaded, shows the indicator only
while `updating`, disables Refresh while `updating`, surfaces `error` while keeping the
last time, and triggers `onRefresh` on press.

### 2. Per-module widget tests

```bash
pnpm --filter @sousa99/fly-over-tracker-components test
pnpm --filter @sousa99/bus-catcher-components test
pnpm --filter @sousa99/procrastinator-tracker-components test
```

**Expected**: each published widget's test renders the standardized status area and verifies
the wiring from [`data-model.md`](./data-model.md) — `lastUpdatedAt` from the successful
load, `updating` while in flight, `error` on failure, `onRefresh` triggering a re-load.
The fly-over suite additionally proves the old count/status header line is gone.

### 3. Storybook cross-module consistency (SC-005)

```bash
pnpm --filter ./modules/fly-over-tracker/frontend storybook   # :6006
pnpm --filter ./modules/bus-catcher/frontend storybook        # :6006 (own port)
pnpm --filter ./modules/procrastinator-tracker/frontend storybook
```

Open a widget story from each module (aircraft widget/card, `StopCard`, `TaskDeckWrapper`)
side by side. **Expected**: the status bar wording (`Last updated HH:MM:SS`,
`Not updated yet`, `Updating…`, `Refresh`), layout, and placement are identical; the
Refresh button triggers a reload; the indicator appears while loading.

### 4. SPA end-to-end per module

Start a backend + SPA for a module, e.g. fly-over-tracker:

```bash
pnpm --filter ./modules/fly-over-tracker/backend dev          # REST on :3000
pnpm --filter ./modules/fly-over-tracker/frontend dev         # SPA on :5173
```

**Expected**: each embedded widget shows `Last updated {local time}`, advances on every
successful load (auto-refresh and manual Refresh), shows `Updating…` while loading, keeps
the last time + shows an error when the backend is down, and recovers on Refresh once the
backend responds (SC-003, FR-006).

### 5. Release-surface check

```bash
pnpm --filter ./modules/fly-over-tracker/frontend build:lib
```

Inspect `dist-lib/index.js` — **Expected**: the `WidgetStatusBar` implementation is bundled
into the module's output (the shared package is not in `rollupOptions.external`). Verify
the shared package is absent from `.changeset/config.json` and has `private: true` —
only the three module release groups exist, unchanged (per user direction, `research.md` §2).

## Gate run (before any PR)

```bash
pnpm lint && pnpm format && pnpm typecheck && pnpm test
```

**Expected**: all four gates green across the workspace, including the new shared package.