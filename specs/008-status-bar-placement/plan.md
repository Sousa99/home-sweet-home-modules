# Implementation Plan: Status Bar Placement Outside the Card

**Branch**: `008-status-bar-placement` | **Date**: 2026-10-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-status-bar-placement/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

The bus-catcher **published `StopCard` widget** moves its standardized status bar (`WidgetStatusBar`
from `@sousa99/homesweethome-components`) out of the card's interior and up above it. Today the bar
renders inside the `Card` (between the header and the content). It becomes the **first child of a new
widget root container**, with the `Card` as the second child — so the status bar sits directly above
the card, outside its border/background, aligned to the card's width (FR-001..FR-004).

The change is purely presentational and **additive-safe**: no public prop, export, or behavior of
`StopCard` changes; the status bar's props, wording, controls, and accessibility behavior are
untouched and remain governed by spec 005 (FR-005). Existing component tests (which query by role and
text) keep passing; new tests lock the placement (FR-001..FR-006). Backend, MCP, the shared
`WidgetStatusBar`, and other modules are untouched.

## Technical Context

**Language/Version**: TypeScript (ES2023), React 19, Node 24, pnpm 11

**Primary Dependencies**: React 19, Tailwind CSS v4, `@sousa99/homesweethome-components`
(`WidgetStatusBar`), the module's own `ui/card` primitives, Vite 6 + `vite-plugin-dts` (lib build),
Vitest 3 + `@testing-library/react` + `@testing-library/user-event` + jsdom. Shared presets from
`@sousa99/homesweethome-config`.

**Storage**: N/A — frontend-only. No persistence, no data model change; the feature is a pure render
structure change.

**Testing**: Vitest + `@testing-library/react` + jsdom. The suite lives alongside the component
(`src/components/StopCard.test.tsx`). Existing tests assert status-bar behavior by role/text and are
**unaffected** by the DOM move. New tests assert placement: the status bar is the first child of the
widget root container and is **not** a descendant of the card element; the card interior contains no
status text; two stacked widgets each keep a bar above their own card. Root gates: `pnpm lint`,
`pnpm format`, `pnpm typecheck`, `pnpm test`.

**Target Platform**: Browser — published React component library (SPA + Storybook + `dist-lib` build).

**Project Type**: Frontend component library. One existing module package
(`@sousa99/bus-catcher-components`) is modified; no new packages.

**Performance Goals**: No measurable render or layout overhead. The only structural change is one new
wrapper `<div>` per widget; the status bar and card render exactly as before.

**Constraints**:
- **No public API change (spec Assumptions)**: `StopCardProps` (including `fetchTimes`, `baseUrl`,
  `missing`, `thresholds`) is unchanged — no prop added, removed, or renamed. The published export
  surface (`src/index.ts`) is untouched.
- **Behavior unchanged (FR-005, spec 005)**: `WidgetStatusBar` receives the exact same props
  (`lastUpdatedAt`, `updating`, `error`, `onRefresh`) and its render contract (wording, controls,
  live regions) is untouched. This feature only moves where the bar is mounted relative to the card.
- **Existing tests must keep passing**: assertions use `screen.getByRole('status')`,
  `getByText(/Last updated …/)`, `getByRole('button', { name: 'Refresh' })` etc. — none depend on the
  bar being inside the card, so they continue to pass unchanged.
- **Layout regressions**: the widget must keep working in the SPA's vertical `space-y-4` stack and in
  Storybook; the wrapper's internal gap must not visibly enlarge or crowd the card.

**Scale/Scope**: 1 module, 1 component render restructure + placement tests + stories/docs. No
backend, MCP, data, shared-package, or contract-of-record changes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Module-First** — PASS. Changes are confined to the existing `modules/bus-catcher/frontend`
  package. No new module, no organizational-only code.
- **II. Local-First & Private by Default** — PASS. Frontend-only placement change; no data, network,
  or external surface introduced. The widget remains local-first.
- **III. Declared Identity & Uniform Tooling** — PASS. Package identity, name, and the shared
  `@sousa99/homesweethome-config` presets are unchanged; no per-package config drift.
- **IV. Test-First (NON-NEGOTIABLE)** — PASS. The placement change is implemented red → green →
  refactor with Vitest/RTL per the `test-first` skill: failing placement tests first, then the render
  restructure, then a green run.
- **V. Contract & Integration Testing** — PASS. The `StopCard` render layout is a UI contract locked
  by component tests (bar outside the card, first child of the widget root, per-card attribution).
  Additive only — no REST or MCP surface changes, so no backend contract tests.
- **Releases** — PASS. A presentational change ⇒ a normal patch/minor bump for
  `@sousa99/bus-catcher-components` via its existing changeset fixed group. No change to other modules.

Result: all gates PASS; no violations to justify in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/008-status-bar-placement/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── stop-card-layout.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# modules/bus-catcher/frontend — modified/added files
src/components/
├── StopCard.tsx                 # MODIFY: wrap widget in a root container; move WidgetStatusBar out of the Card, above it
├── StopCard.test.tsx            # MODIFY + ADD: placement tests (bar outside card, first child, per-card attribution)
├── StopCard.stories.tsx         # MODIFY: add a multi-widget story showing bar-above-card attribution (FR-006)
└── StopCard.mdx                 # MODIFY: "Status bar" section — bar renders above the card, not in the card header

# Unchanged: src/index.ts, src/pages/Dashboard.tsx, ui/card.tsx, api client, shared WidgetStatusBar, backend
```

**Structure Decision**: All changes live in the existing `modules/bus-catcher/frontend` package. The
`StopCard` render restructure is confined to `StopCard.tsx`; no new files, no new exports, no
component extraction. The wrapper container is an internal detail of the widget (identified by a
`data-testid` for tests), following the repo's existing `data-testid` convention (`urgency-dot`,
`status-bar-controls`). No restructuring of the package is required.

## Complexity Tracking

> No Constitution Check violations — not applicable. All gates pass without justification.