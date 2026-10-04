# Implementation Plan: Task Card Polish

**Branch**: `006-task-card-polish` | **Date**: 2026-10-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-task-card-polish/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

The procrastinator-tracker **published task deck widget family** (`TaskDeck`, `TaskDeckWrapper`, raw `DeckCards`) gets three additive polish improvements:

1. **Empty state** — a visible, card-styled empty state (icon + friendly message) renders whenever there are no tasks to display, at **both** the published `TaskDeck` level (today it renders `null` → blank) and the `TaskDeckWrapper` level (today it renders a bare `<p>`). The message covers both "no tasks yet" and "no tasks match the filters".
2. **Gentler transition** — the wide ±500px sideways exit pan stays the **default**; a new opt-in `transitionVariant: 'gentle'` reduces the exiting card's horizontal travel to ~15% (≈80px) while preserving duration, rotation, stack depth, and swipe behavior.
3. **Compact default size** — the deck stage's fixed 24–26rem height is replaced by a compact `16rem` default driven by a CSS custom property, so consumers can still grow the card through the existing style surface (no new sizing API, per spec Assumptions).

All changes are additive: no existing prop is removed or renamed, and default behavior (wide pan, `className`/`style` surfaces, published exports) is preserved. Backend and MCP are untouched.

## Technical Context

**Language/Version**: TypeScript (ES2023), React 19, Node 24, pnpm 11

**Primary Dependencies**: React 19, `motion` v13 (`motion/react` — used by the deck for drag/exit animations), Tailwind CSS v4, `lucide-react`, Vite 6 + `vite-plugin-dts` (lib build), Vitest 3 + `@testing-library/react` + `@testing-library/user-event` + jsdom. The wrapper already consumes `@sousa99/homesweethome-components` (`WidgetStatusBar`) — unchanged. Shared presets from `@sousa99/homesweethome-config`.

**Storage**: N/A — frontend-only. No persistence, no data model changes; the feature is entirely presentational and animational.

**Testing**: Vitest + `@testing-library/react` + jsdom. Existing suites live in `modules/procrastinator-tracker/frontend/tests/` (`task-deck.test.tsx`, `task-deck-wrapper.test.tsx`). New tests: empty state at deck + wrapper level, gentle-variant travel mapping, compact default height + override, wrapper prop passthrough. Root gates: `pnpm lint`, `pnpm format`, `pnpm typecheck`, `pnpm test`.

**Target Platform**: Browser — published React component library (SPA + Storybook + `dist-lib` build).

**Project Type**: Frontend component library. One existing module package (`@sousa99/procrastinator-tracker-components`) is modified; no new packages.

**Performance Goals**: No measurable render or animation overhead. The gentle variant keeps the same `slideDurationMs` (default 500ms) — only the exit distance changes. The empty state must not collapse the deck's layout height (it fills the same compact stage), so side-by-side dashboards don't shift when tasks run out.

**Constraints**:
- **Backward compatibility (SC-004)**: no published export removed or renamed; existing consumers who change nothing keep today's wide-pan animation, today's empty text, and today's size. The wrapper's empty message text (`No tasks yet.` / `No tasks match these filters.`) and the deck's existing `data-testid="task-deck-card"` must remain so existing tests keep meaning.
- **No new sizing API (Assumptions)**: card size grows through the existing style surface (`className`/`style`). The compact default height is applied via a CSS custom property so a consumer-provided value always wins over the default without class-conflict ambiguity (the module's `cn` is a plain join, not `tailwind-merge`).
- **Additive props only**: new props (`transitionVariant`, `exitTravel`) have defaults that reproduce current behavior exactly (wide pan = 500px).
- The wrapper already renders an empty `<p>`; the deck renders `null`. Both converge on one shared empty-card component.

**Scale/Scope**: 1 module, 3 component files + 1 new component + export wiring + stories/docs/tests. No backend, MCP, data, or contract-of-record changes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Module-First** — PASS. Changes are confined to the existing `modules/procrastinator-tracker/frontend` package. No new module, no organizational-only code.
- **II. Local-First & Private by Default** — PASS. Frontend-only polish; no data, network, or external surface introduced. The widget remains local-first.
- **III. Declared Identity & Uniform Tooling** — PASS. Package identity, name, and the shared `@sousa99/homesweethome-config` presets are unchanged; no per-package config drift.
- **IV. Test-First (NON-NEGOTIABLE)** — PASS. Empty state, gentle transition, and compact sizing are implemented red → green → refactor with Vitest/RTL per the `test-first` skill.
- **V. Contract & Integration Testing** — PASS. The public props contracts (`TaskDeckProps`, `TaskDeckWrapperProps`, `DeckCardsProps`) and the new `TaskDeckEmpty` export are locked by component tests. Additive only — no REST or MCP surface changes, so no backend contract tests.
- **Releases** — PASS. Additive props and exports with preserved defaults ⇒ a normal patch/minor bump for `@sousa99/procrastinator-tracker-components` via its existing changeset fixed group. No change to other modules.

Result: all gates PASS; no violations to justify in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/006-task-card-polish/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# modules/procrastinator-tracker/frontend — modified/added files
src/
├── components/
│   ├── task/
│   │   ├── TaskDeck.tsx                 # MODIFY: empty-state render + transitionVariant + compact height (CSS var)
│   │   ├── TaskDeckEmpty.tsx            # ADD: shared empty-state card (icon + message, data-testid)
│   │   ├── TaskDeckWrapper.tsx          # MODIFY: reuse TaskDeckEmpty, pass transitionVariant, forward style
│   │   ├── TaskDeck.stories.tsx         # MODIFY: add Empty, Gentle transition, Compact + override stories
│   │   ├── TaskDeckWrapper.stories.tsx  # MODIFY: add Empty and Gentle stories, transitionVariant argTypes
│   │   ├── TaskDeck.mdx                 # MODIFY: document empty state, gentle variant, compact sizing
│   │   └── TaskDeckWrapper.mdx          # MODIFY: same
│   └── ui/deck/
│       └── deck.tsx                     # MODIFY: add exitTravel prop to DeckCards/DeckCard (default 500)
├── index.ts                             # MODIFY: export TaskDeckEmpty + type (additive)
└── tests/                               # (repo test dir for this module)
    ├── task-deck.test.tsx               # MODIFY + ADD: empty state, gentle travel mapping, compact height/override
    └── task-deck-wrapper.test.tsx       # MODIFY: empty-state assertion → card; ADD: transitionVariant passthrough

# Unchanged: backend/, api client, status bar (@sousa99/homesweethome-components), DashboardPage
```

**Structure Decision**: All changes live in the procrastinator-tracker frontend package, in the existing `components/task/` and `components/ui/deck/` directories. The shared empty card is a new component in `components/task/` (it is task-domain UI, not a raw deck primitive), exported additively from `src/index.ts` so consumers can restyle or replace messaging. The raw `deck.tsx` gains a low-level `exitTravel` knob; the semantic `transitionVariant` lives at the `TaskDeck`/`TaskDeckWrapper` level where it is documented. No restructuring of the package is required.

## Complexity Tracking

> No Constitution Check violations — not applicable. All gates pass without justification.