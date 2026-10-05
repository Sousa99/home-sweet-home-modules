# Implementation Plan: Slow Auto-Scroll for the Closest-Flights List

**Branch**: `009-closest-flights-auto-scroll` | **Date**: 2026-10-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-closest-flights-auto-scroll/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

The fly-over-tracker **published `FlyOverClosestPanel` widget** gets the same slow auto-scroll the
weather module's day + hour strip has: when its closest-flights list overflows the visible area, the
list scrolls smoothly on its own — **slower** than the weather strip (the list is compact), pauses
briefly at the end, then returns to the top and loops (FR-001..FR-004). Reduced-motion preferences
are honored exactly like the weather strip (no scrolling, immediate stop on toggle, FR-005), manual
scrolling stays possible by **pausing the animation while the pointer is over the list** (FR-006),
and list content/ordering/refresh behavior are unchanged (FR-007..FR-009).

The animation is implemented as a small, **vertical** auto-scroll hook (`useAutoScroll`) added to the
fly-over-tracker frontend package, modeled on weather-psychic's frame-driven `requestAnimationFrame`
loop (`useAutoScroll` in `modules/weather-psychic/frontend/src/lib/`) but scrolling `scrollTop`
instead of `scrollLeft`, with a slower default pace (25 px/s vs the weather strip's 45 px/s, 2000 ms
end-pause vs 1500 ms) and a hover-pause so users can inspect/scroll manually. The change is confined
to `modules/fly-over-tracker/frontend`; no public prop or export changes, no backend/MCP/data changes.

## Technical Context

**Language/Version**: TypeScript (ES2023), React 19, Node 24, pnpm 11

**Primary Dependencies**: React 19, Tailwind CSS v4, Vitest 3 + `@testing-library/react` +
`@testing-library/user-event` + jsdom. Reference implementation: weather-psychic's
`useAutoScroll` hook and its rAF-driven test harness. Shared presets from
`@sousa99/homesweethome-config`. No new runtime dependencies.

**Storage**: N/A — frontend-only presentation change. No persistence, no data model change.

**Testing**: Vitest + `@testing-library/react` + jsdom with `vi.useFakeTimers` and a deterministic
`requestAnimationFrame` driver (the exact harness weather-psychic uses in
`lib/__tests__/useAutoScroll.test.ts`). The hook gets its own unit test file; the component gets
auto-scroll wiring tests alongside the existing `FlyOverClosestPanel.test.tsx` suite. Root gates:
`pnpm lint`, `pnpm format`, `pnpm typecheck`, `pnpm test`.

**Target Platform**: Browser — published React component library (SPA + Storybook + `dist-lib` build).

**Project Type**: Frontend component library. One existing module package
(`@sousa99/fly-over-tracker-components`) is modified; no new packages.

**Performance Goals**: The animation runs on `requestAnimationFrame` at display refresh (smooth,
frame-driven — same as the weather strip), so it is 60 fps by construction and adds no measurable
render cost. The auto-scroll only runs while the list actually overflows.

**Constraints**:
- **No public API change (spec Assumptions)**: `FlyOverClosestPanelProps` (incl. `maxResults`) is
  unchanged — no prop added, removed, or renamed; the published export surface (`src/index.ts`) is
  untouched. The animation parameters live as internal defaults on the hook/component.
- **Module self-containment (Constitution I)**: the hook is **replicated** inside the fly-over-tracker
  package, not imported from weather-psychic or added to `@sousa99/homesweethome-components` (that
  package holds no hooks; modules stay self-contained). The vertical orientation means the code is a
  small, intentional variant anyway.
- **Slower than weather (FR-002)**: default pace 25 px/s and 2000 ms end-pause — visibly calmer than
  the weather strip's 45 px/s / 1500 ms, tuned for the compact card list.
- **Reduced motion (FR-005)**: same `matchMedia('(prefers-reduced-motion: reduce)')` handling —
  never start scrolling when enabled; stop mid-scroll if it toggles on.
- **Manual scroll coexistence (FR-006)**: auto-scroll pauses while the pointer is over the list
  (wheel/touch scrolling happens while hovered) and resumes on pointer leave — the animation never
  fights the user.
- **Existing tests must keep passing**: all current `FlyOverClosestPanel.test.tsx` assertions
  (closest tile + capped list, states, status bar, refresh) stay green; the change is additive.
- **Empty/short/loading/error lists never scroll (FR-007..FR-009)**: the hook only moves when there
  is real overflow; the existing empty/loading/error renders are untouched.

**Scale/Scope**: 1 module frontend package — 1 new hook file (+ tests), 1 component wiring change
(+ tests), storybook/docs updates. No backend, MCP, data, shared-package, or contract-of-record
changes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Module-First** — PASS. Changes are confined to the existing `modules/fly-over-tracker/frontend`
  package. No new module, no organizational-only code.
- **II. Local-First & Private by Default** — PASS. Frontend-only animation change; no data, network,
  or external surface introduced. The widget remains local-first.
- **III. Declared Identity & Uniform Tooling** — PASS. Package identity, name, and the shared
  `@sousa99/homesweethome-config` presets are unchanged; no per-package config drift.
- **IV. Test-First (NON-NEGOTIABLE)** — PASS. The animation is implemented red → green → refactor
  with Vitest/RTL per the `test-first` skill: failing auto-scroll tests first, then the hook and the
  component wiring, then a green run.
- **V. Contract & Integration Testing** — PASS. The closest-list auto-scroll is a **UI behavior
  contract** locked by component tests (list scrolls on overflow, pauses at end, loops, hover-pause,
  reduced-motion). Additive only — no REST or MCP surface changes, so no backend contract tests.
- **Releases** — PASS. A frontend behavior change ⇒ a normal patch/minor bump for
  `@sousa99/fly-over-tracker-components` via its existing changeset fixed group. No change to other
  modules.

Result: all gates PASS; no violations to justify in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/009-closest-flights-auto-scroll/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── closest-list-auto-scroll.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# modules/fly-over-tracker/frontend — modified/added files
src/lib/
└── useAutoScroll.ts             # ADD: vertical auto-scroll hook (frame-driven rAF, hover-pause, reduced motion)

src/lib/__tests__/
└── useAutoScroll.test.ts        # ADD: hook unit tests (advance, end-pause + loop, reduced motion, hover-pause)

src/components/
├── FlyOverClosestPanel.tsx      # MODIFY: attach the hook's ref to the list container (the maxResults-capped region)
├── __tests__/FlyOverClosestPanel.test.tsx   # MODIFY + ADD: wiring tests (overflow list scrolls, short list static, reduced motion, hover-pause)
├── FlyOverClosestPanel.stories.tsx          # MODIFY: add a long-list story that overflows to show the auto-scroll
└── FlyOverClosestPanel.mdx                  # MODIFY: "Behavior notes" — auto-scrolling list, hover-pause, reduced motion

# Unchanged: src/index.ts, ClosestAircraftCard.tsx, FlyOverList.tsx, AircraftCard/AircraftMapCard,
#            api client, hooks, Tailwind theme, backend, MCP, shared package
```

**Structure Decision**: All changes live in the existing `modules/fly-over-tracker/frontend` package.
The new `useAutoScroll` hook goes in `src/lib/` (matching weather-psychic's `lib/useAutoScroll.ts`
placement), with its unit tests in `src/lib/__tests__/` (matching the repo's `__tests__` convention).
The component change is confined to `FlyOverClosestPanel.tsx`: the hook's `ref` attaches to the list
container (`div.mt-2.min-h-0.flex-1.space-y-2.overflow-y-auto`), so only that region auto-scrolls
while the closest tile above stays static. No new exports, no component extraction, no package
restructuring.

## Complexity Tracking

> No Constitution Check violations — not applicable. All gates pass without justification.