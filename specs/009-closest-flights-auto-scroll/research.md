# Research: Slow Auto-Scroll for the Closest-Flights List

**Feature**: `009-closest-flights-auto-scroll` | **Date**: 2026-10-04

The feature spec (009) introduced no `NEEDS CLARIFICATION` markers; the scope ("the N closest
flights list in fly-over-tracker"), the source behavior ("the slow scroll animation from the weather
day + hour strip"), and the calibration note ("the list is small, so make it less fast") are explicit.
The research below resolves the design questions that remained: how to reuse the weather animation
across module boundaries, how slow "slower" is, how manual scrolling coexists with an auto-scroll,
and how to lock the behavior in tests.

## R1 — Reusing the weather auto-scroll in fly-over-tracker

- **Decision**: Replicate the animation as a **vertical** `useAutoScroll` hook inside the
  fly-over-tracker frontend package, modeled on weather-psychic's `useAutoScroll`
  (`modules/weather-psychic/frontend/src/lib/useAutoScroll.ts`): the same frame-driven
  `requestAnimationFrame` loop that advances the scroll position by `speedPxPerSecond` each frame,
  holds at the end for `resetPauseMs`, then snaps back to the start and loops — but writing to
  `scrollTop` (vertical) instead of `scrollLeft` (horizontal). Same `ref` contract, same option shape
  (`speedPxPerSecond`, `resetPauseMs`), same `(prefers-reduced-motion: reduce)` handling.
- **Rationale**: The modules are **self-contained** (Constitution I) and `@sousa99/homesweethome-components`
  ships no hooks — only UI primitives (`cn`, `formatLastUpdated`, `WidgetStatusBar`). Cross-importing
  from weather-psychic would couple two independent modules; the vertical orientation makes the copy a
  deliberate, small variant rather than a straight duplication. Keeping the hook in `src/lib/` mirrors
  weather-psychic's own layout, so the two implementations stay conceptually parallel and easy to
  compare.
- **Alternatives considered**:
  - *Import weather-psychic's hook* — rejected: breaks module self-containment and would drag a
    horizontal-only hook across a module boundary.
  - *Add the hook to `@sousa99/homesweethome-components`* — rejected: the shared package holds no
    hooks today, and it is not the established place for module behavior.
  - *Axis-generic hook (`axis: 'horizontal' | 'vertical'`)* — rejected as premature: only the
    vertical case is needed here; a generic version adds surface without a second consumer.

## R2 — How slow should "slower" be (FR-002, SC-002)

- **Decision**: Default the list to `speedPxPerSecond = 25` and `resetPauseMs = 2000`, versus the
  weather strip's `45` px/s and `1500` ms. Both are internal defaults on the hook — no public props.
- **Rationale**: The closest-flights list is compact (each card row is ~110–140 px tall), so at 45 px/s
  a row would cross the view in ~3 s — busy for a small widget. At 25 px/s a row takes ~5 s: a calm,
  readable glide that still makes the loop useful, and is measurably (~45%) slower than the weather
  strip (SC-002). The 2000 ms end-pause reads more restful than 1500 ms at the slower pace. The
  values live as hook defaults so implementation-time tuning is a one-line change.
- **Alternatives considered**:
  - *15 px/s* — too slow; a full loop on a long list would feel stalled.
  - *35 px/s* — barely distinguishable from the weather strip; fails SC-002's "visibly calmer".
  - *Expose speed props on `FlyOverClosestPanelProps`* — rejected: spec Assumptions forbid public API
    changes; internal defaults keep the surface stable.

## R3 — How manual scrolling coexists with the auto-scroll (FR-006)

- **Decision**: The hook **pauses while the pointer is over the scroll container** and resumes when the
  pointer leaves. Implemented with `pointerenter` / `pointerleave` listeners that suspend the
  `requestAnimationFrame` advancement (holding position) without tearing down the loop.
- **Rationale**: A dashboard widget is primarily read, not scrolled; the natural way to "take control"
  is to hover (or touch) the list — which is also exactly when wheel/touch scrolling happens. Pausing
  on hover means the animation never fights the user (FR-006) while still auto-scrolling on its own
  when idle. It is deterministic and easy to test (`fireEvent.pointerEnter` / `pointerLeave`).
- **Alternatives considered**:
  - *Detect user `scroll` events and cool down* — unreliable: programmatic `scrollTop` writes also
    fire `scroll`, so distinguishing user intent needs timestamps and still leaves edge cases.
  - *Pause on focus only* — keyboards aren't a scroll input here; hover covers mouse, wheel, and touch
    in one mechanism.
  - *Never pause* (weather strip behavior) — would make the list impossible to read closely and fails
    FR-006 as written.

## R4 — Reduced-motion parity with the weather strip (FR-005)

- **Decision**: Mirror the weather hook's exact pattern: read `matchMedia('(prefers-reduced-motion: reduce)')`
  once, listen for `change` events, and (a) never start the loop when reduced motion is enabled and
  (b) stop advancing immediately if it toggles on mid-scroll.
- **Rationale**: The spec's FR-005 and the weather strip's behavior are identical; reusing the same
  mechanism guarantees cross-module consistency (SC-004) and inherits the already-tested semantics.
- **Alternatives considered**: none — this is a parity requirement, not a design choice.

## R5 — Which list is "the N closest flights" (scope)

- **Decision**: The auto-scroll applies to the **list region of `FlyOverClosestPanel`** — the
  `div.mt-2.min-h-0.flex-1.space-y-2.overflow-y-auto` that renders the remaining aircraft capped by
  `maxResults`. The closest-aircraft tile above it stays static; `ClosestAircraftCard`,
  `FlyOverList`, and the map are out of scope.
- **Rationale**: `FlyOverClosestPanel` is the widget that literally presents "the N closest flights
  as a list" (`maxResults` = N). Auto-scrolling the *capped list* is the direct, minimal reading of
  the request; the closest tile is a single prominent card and would scroll awkwardly. Per spec
  Assumptions, other surfaces are out of scope unless they present the same N closest list.
- **Alternatives considered**:
  - *`FlyOverList` (full dashboard list)* — a separate, user-driven list view in the SPA; the request
    names the "N closest" list, not the full query result.
  - *`ClosestAircraftCard` (single closest)* — no list to scroll; out of scope by definition.

## R6 — Test strategy

- **Decision**: Reuse weather-psychic's rAF test harness — `vi.useFakeTimers()` plus a deterministic
  `requestAnimationFrame`/`cancelAnimationFrame` driver that steps 16 ms frames — for the hook unit
  tests (`src/lib/__tests__/useAutoScroll.test.ts`). Component wiring tests in
  `FlyOverClosestPanel.test.tsx` render an overflowing list (a `maxResults`-large fixture), stub the
  hook's globals the same way, and assert `scrollTop` advances; plus short-list (static), reduced
  motion (static), and hover-pause cases. All existing assertions stay unchanged.
- **Rationale**: The harness is proven in the source module and makes the loop fully deterministic
  (advance, end-pause, reset, loop) without real timing. Keeping every existing test green is a
  verification requirement (FR-007).
- **Alternatives considered**: *jest-style animation mocks* — rejected; the rAF driver is already the
  house pattern in weather-psychic and asserts the actual scroll math.

## Consolidated decisions

| # | Topic | Decision |
|---|-------|----------|
| R1 | Cross-module reuse | New vertical `useAutoScroll` hook in fly-over-tracker `src/lib/`, modeled on weather-psychic's (scrollTop, same options, same reduced-motion pattern) |
| R2 | Speed calibration | Defaults `25` px/s + `2000` ms end-pause (vs weather's `45`/`1500`); internal, no public props |
| R3 | Manual scroll (FR-006) | Hover-pause: animation holds while the pointer is over the list, resumes on leave |
| R4 | Reduced motion (FR-005) | Identical `matchMedia` pattern to the weather strip |
| R5 | Surface (scope) | The `maxResults`-capped list region of `FlyOverClosestPanel`; closest tile static; other lists/map out of scope |
| R6 | Tests | Weather-psychic rAF driver + fake timers for the hook; wiring tests in `FlyOverClosestPanel.test.tsx`; existing tests unchanged |