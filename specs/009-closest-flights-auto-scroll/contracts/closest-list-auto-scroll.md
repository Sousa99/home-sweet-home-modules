# Contract: Published FlyOverClosestPanel — Closest-List Auto-Scroll

**Feature**: `009-closest-flights-auto-scroll` | **Date**: 2026-10-04

The only external interface affected by this feature is the **rendered behavior** of the published
fly-over-tracker `FlyOverClosestPanel` widget: its closest-flights list region auto-scrolls slowly.
It is a **UI behavior contract**: the public props/export surface is unchanged, and the change is
limited to the list's scroll behavior.

## Public surface (unchanged)

`src/index.ts` still exports `FlyOverClosestPanel` and `FlyOverClosestPanelProps` — nothing added,
removed, or renamed (spec Assumptions).

`FlyOverClosestPanelProps` is **unchanged** — `location`, `autoRefresh`, `baseUrl`, `maxResults`,
and `className` keep their current signatures, defaults, and meanings. The animation parameters are
internal defaults (25 px/s, 2000 ms end-pause), not props.

## Behavior contract (changed)

The list region of the panel — the scrollable container rendering the `maxResults`-capped aircraft
after the closest tile — behaves as follows:

- **Auto-scroll on overflow (FR-001, FR-008)**: when the list's content is taller than its visible
  area (`scrollHeight > clientHeight`), the list scrolls slowly and smoothly on its own, in the
  list's natural vertical direction. When everything fits, the list stays static.
- **Slower than weather (FR-002)**: the pace is `25 px/s` — measurably slower than the weather day +
  hour strip's `45 px/s`, tuned for the compact card list (SC-002).
- **End-pause and loop (FR-003)**: on reaching the last row the list holds for `2000 ms`, then
  returns to the top and continues scrolling — a continuous loop.
- **Reduced motion (FR-005)**: when the user prefers reduced motion, the list never auto-scrolls; if
  the preference is enabled mid-scroll, the list stops immediately (same mechanism as the weather
  strip).
- **Manual scroll wins (FR-006)**: while the pointer is over the list, the animation pauses and the
  position is held, so the user can scroll freely (wheel/touch); on pointer leave the loop resumes.
- **Content unchanged (FR-007)**: the list's rows, closest-first ordering, `maxResults` capping, and
  refresh behavior are exactly as today.
- **States unchanged (FR-009)**: loading, empty ("No aircraft within … km"), and error states render
  as today and never auto-scroll.
- **Closest tile static**: the prominent closest-aircraft tile above the list is unaffected.

## Non-goals (scope)

- `ClosestAircraftCard` (single closest — no list) is untouched.
- `FlyOverList` (full query-result list in the SPA) and the map are untouched (spec Assumptions).
- No backend, MCP, REST, or shared-package change (V. Contract & Integration).

## Accessibility contract

- **Reduced motion**: the animation fully respects `prefers-reduced-motion: reduce` — this is the
  feature's primary accessibility guarantee (FR-005).
- **No content change**: auto-scroll only affects scroll position; it never removes, hides, or
  reorders rows, and it does not change focus or semantics. The list remains scrollable/readable by
  keyboard and assistive tech exactly as before.
- **Hover-pause is an enhancement**: at worst (pointer never leaves) the list behaves like today's
  manually-scrollable list; the animation never traps the user.

## Validation

- `src/lib/__tests__/useAutoScroll.test.ts` (**new**): the hook advances `scrollTop` smoothly, holds
  at the end for the pause, resets to the top, loops, never moves under reduced motion, and pauses on
  hover (FR-001..FR-006).
- `src/components/__tests__/FlyOverClosestPanel.test.tsx` (**add cases**):
  - An overflowing list (`maxResults`-large fixture) scrolls on its own (`scrollTop` advances).
  - A short list (no overflow) and the empty state never scroll (FR-008, FR-009).
  - Reduced motion ⇒ no scroll (FR-005).
  - `pointerEnter` pauses / `pointerLeave` resumes (FR-006).
  - **Existing**: the whole current suite (closest tile + capped list, states, status bar, refresh,
    prop plumbing) passes unchanged (FR-007).
- Storybook (`FlyOverClosestPanel.stories.tsx`): a long-list story overflows and visibly auto-scrolls
  (see `quickstart.md`).