# Quickstart: Validating the Closest-Flights Auto-Scroll

**Feature**: `009-closest-flights-auto-scroll` | **Date**: 2026-10-04

This guide proves the feature works end-to-end. It is a validation/run guide — full implementation
lives in `tasks.md` and the implementation phase.

## Prerequisites

- pnpm 11 + Node 24, repo installed (`pnpm install`).
- The fly-over-tracker frontend package exists as described in [`plan.md`](./plan.md), with auto-scroll
  tests written first (red → green).
- A browser with the SPA / Storybook running to observe the animation visually.

## What is validated

| # | Scenario | Proves |
|---|----------|--------|
| 1 | Hook unit tests pass | The animation advances smoothly, pauses at the end, loops, respects reduced motion, and pauses on hover ([`contracts/closest-list-auto-scroll.md`](./contracts/closest-list-auto-scroll.md)) |
| 2 | Component wiring tests pass | An overflowing closest list auto-scrolls; short/empty lists stay static; hover pauses; reduced motion disables it (FR-001..FR-009) |
| 3 | Existing panel tests still pass | List content, ordering, capping, status bar, and refresh are unchanged (FR-007) |
| 4 | Storybook visual check | The long-list story visibly glides at a slower pace than the weather strip and pauses on hover |
| 5 | Public surface check | No export or prop change |

## Commands

### 1. Hook unit tests + component tests

```bash
pnpm --filter ./modules/fly-over-tracker/frontend test
pnpm --filter ./modules/fly-over-tracker/frontend typecheck
```

**Expected**:
- `src/lib/__tests__/useAutoScroll.test.ts` passes — `scrollTop` advances ~frame-by-frame toward the
  max, holds at the end for `resetPauseMs`, snaps back to `0` and keeps scrolling; reduced motion and
  hover-pause cases hold position.
- `src/components/__tests__/FlyOverClosestPanel.test.tsx` passes including the new cases — an
  overflowing list (`maxResults`-large fixture) advances `scrollTop`, a short/empty list never
  scrolls, reduced motion never scrolls, `pointerEnter` pauses and `pointerLeave` resumes.
- Every **existing** panel assertion (closest tile not repeated, `maxResults` cap, loading/empty/
  error states, status bar last-updated, Refresh, prop plumbing) passes **unchanged**.

### 2. Visual check — Storybook

```bash
pnpm --filter ./modules/fly-over-tracker/frontend storybook   # :6006
```

Open `DashboardWidgets/FlyOverClosestPanel`:

- **WithAircraft / CappedList**: the closest tile is static; the list below scrolls slowly on its own
  when it overflows, pauses at the end, then returns to the top and loops.
- **Long list story** (new, many aircraft): the auto-scroll is clearly visible and feels **calmer than
  the weather day + hour strip** (SC-002).
- **Hover**: move the pointer over the list — the animation pauses; leave — it resumes (FR-006).
- **Empty / Error**: static, exactly as before (FR-009).
- Compare against the weather strip (`pnpm --filter ./modules/weather-psychic/frontend storybook`,
  `HourlyStrip` / `CurrentWeatherCard`) to confirm the closest list is visibly slower.

### 3. Reduced motion check

Enable the OS-level "reduce motion" preference and reload the Storybook page:

- The long-list story never auto-scrolls (FR-005). Toggling the preference off mid-view resumes the
  loop; toggling it on stops it immediately.

### 4. SPA end-to-end (optional)

```bash
pnpm --filter ./modules/fly-over-tracker/backend dev          # REST on :3000
pnpm --filter ./modules/fly-over-tracker/frontend dev         # SPA on :5173
```

Query a location with several aircraft overhead: the closest panel's list auto-scrolls at the slow
pace while the closest tile stays put; data refresh and manual scroll work as before.

### 5. Public surface check (spec Assumptions)

```bash
pnpm --filter ./modules/fly-over-tracker/frontend build:lib
```

Inspect `dist-lib/index.d.ts`: `FlyOverClosestPanel` and `FlyOverClosestPanelProps` are intact with
their existing props — nothing added, removed, or renamed.

## Gate run (before any PR)

```bash
pnpm lint && pnpm format && pnpm typecheck && pnpm test
```

**Expected**: all four gates green across the workspace, including the fly-over-tracker frontend package.