# Implementation Plan: Standardized Component Status

**Branch**: `005-standardized-component-status` | **Date**: 2026-10-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-standardized-component-status/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

Every published **data-fetching widget** across the Home Sweet Home modules (aircraft widgets in fly-over-tracker, the bus waiting-times card in bus-catcher, the task deck in procrastinator-tracker) gains an identical status bar: the local time of the last successful update ("Last updated 14:32:05"), a transient "Updating…" indicator while a load is in flight, and a Refresh control. The status bar is built once as a **shared, workspace-internal package** (`@sousa99/homesweethome-components`), reused by every widget so wording, layout, and behavior are identical by construction.

Per the user's direction, the shared package is **not versioned and not published**: it ships at the workspace version, is consumed as a bundling-time dependency, and its code is **bundled into each module's already-published components package** — consumers of `@sousa99/<slug>-components` receive the status bar with no extra install or version to track.

## Technical Context

**Language/Version**: TypeScript (ES2023), React 19, Node 24, pnpm 11

**Primary Dependencies**: React 19, Tailwind CSS v4 (per-module `@tailwindcss/vite`), Vite 6 + `vite-plugin-dts` (per-module lib builds), Vitest 3 + @testing-library/react (shared package and per-module tests), TanStack Query v5 (consumed by the fly-over widgets' existing data hook). Shared presets from `@sousa99/homesweethome-config`.

**Storage**: N/A — the feature is presentational. The last-update timestamp and load state are derived at runtime in each widget; nothing is persisted.

**Testing**: Vitest + @testing-library/react + @testing-library/user-event + jsdom. Shared-package unit tests for `WidgetStatusBar` and `formatLastUpdated`; per-module component tests assert each published widget renders the standardized status area. Root gates: `pnpm lint`, `pnpm format`, `pnpm typecheck`, `pnpm test`.

**Target Platform**: Browser — the shared status bar is consumed by published React component libraries (SPA + Storybook + lib builds).

**Project Type**: Frontend component library. One new **internal (non-published)** shared package under `packages/`, plus integration into the published frontend packages of three modules.

**Performance Goals**: Per SC-003, after pressing Refresh the widget reflects the new load (timestamp advances, indicator clears) within 2 s under normal conditions. The shared bar adds no measurable render overhead; it is a small controlled component.

**Constraints**: The shared package MUST NOT be versioned or published (workspace version only, no changesets entry, `private: true`). It MUST be bundled into each module's `dist-lib` so downstream consumers need no extra dependency. The status bar wording/layout/behavior MUST be identical across all widgets (FR-004). Tailwind v4 utility classes used by the shared component MUST be generated in each consuming module's stylesheet (explicit `@source` directive).

**Scale/Scope**: 1 new shared package; 8 published data-fetching widgets integrated across 3 modules (5 in fly-over-tracker, 1 in bus-catcher, 2 in procrastinator-tracker). Presentational/live components (clock family, time-format toggle, controlled display components fed by props) are exempt per Q1.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Module-First** — PASS. The new package lives under `packages/` (workspace-glob membership, same as the sanctioned `packages/config`), not as a module. It is an internal shared library, not a feature module, so it does not need `modules/<slug>/` shape. No feature ships as organizational-only.
- **II. Local-First & Private by Default** — PASS. The shared package is `private: true` and never published; it is consumed only by the in-repo module packages. No external surface, no cloud/remote tooling.
- **III. Declared Identity & Uniform Tooling** — PASS. The package declares identity `@sousa99/homesweethome-components` in `package.json`, extends the shared presets (`@sousa99/homesweethome-config`) for lint/format/tsconfig — no per-package drift.
- **IV. Test-First (NON-NEGOTIABLE)** — PASS. `WidgetStatusBar`, `formatLastUpdated`, and every widget integration are written test-first with Vitest (red → green → refactor) per the `test-first` skill.
- **V. Contract & Integration Testing** — PASS. The shared component's public props contract is locked by tests in the shared package; per-module component tests verify each published widget integrates the standardized status area. No REST/MCP contract changes, so no backend contract tests required.
- **Releases** — PASS with user clarification. The shared package is NOT added to any changesets fixed group and is never published; per-module release groups remain unchanged. Because the shared code ships inside the published module packages, a change to the shared package is released by bumping the consuming modules (their normal changesets), which is exactly "publish through the already developed components".

Result: all gates PASS; no violations to justify in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/005-standardized-component-status/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# New internal shared package (workspace-internal, NOT published, NOT versioned)
packages/components/
├── package.json                     # @sousa99/homesweethome-components, private: true, version 0.0.1
├── tsconfig.json                    # extends @sousa99/homesweethome-config/tsconfig.base + DOM/react
├── eslint.config.mjs                # extends @sousa99/homesweethome-config/eslint
├── prettier.config.mjs              # extends @sousa99/homesweethome-config/prettier
├── vitest.config.ts
├── src/
│   ├── index.ts                     # exports WidgetStatusBar, formatLastUpdated + types
│   ├── WidgetStatusBar.tsx          # the shared, controlled status bar
│   ├── formatLastUpdated.ts         # timestamp -> local "HH:MM:SS" (+ shared date/format types)
│   └── __tests__/
│       ├── WidgetStatusBar.test.tsx
│       └── formatLastUpdated.test.ts

# Existing module packages — integrated (per module, same shape):
# modules/fly-over-tracker/frontend/
#   ├── src/components/FlyOverWidget.tsx           -> swap UpdatingIndicator+Refresh for WidgetStatusBar
#   ├── src/components/FlyOverMapCard.tsx          -> same
#   ├── src/components/FlyOverListCard.tsx         -> same
#   ├── src/components/FlyOverClosestPanel.tsx     -> same
#   ├── src/components/ClosestAircraftCard.tsx     -> same
#   ├── src/components/UpdatingIndicator.tsx       -> REMOVED (superseded; or kept private if still used by SPA)
#   ├── src/index.css                              -> add `@source "../../../packages/components/src"`
#   └── package.json                               -> add devDependency workspace:* on the shared package
# modules/bus-catcher/frontend/
#   ├── src/components/StopCard.tsx                -> render WidgetStatusBar; track lastUpdatedAt in LoadState
#   ├── src/index.css                              -> add `@source ...`
#   └── package.json                               -> add devDependency workspace:*
# modules/procrastinator-tracker/frontend/
#   ├── src/components/task/TaskDeckWrapper.tsx    -> render WidgetStatusBar; track lastUpdatedAt on success
#   ├── src/index.css                              -> add `@source ...`
#   └── package.json                               -> add devDependency workspace:*
```

**Structure Decision**: One shared, presentational (controlled) status bar in a new internal `packages/components` package, consumed by each module's published widgets and bundled into their `dist-lib`. The shared package holds no data-fetching logic — widgets keep their own load state and pass `lastUpdatedAt`, `updating`, `error`, and `onRefresh` as props. This matches the user's direction (workspace-only, publish through existing components) and keeps the existing per-widget auto-refresh behavior intact.

## Complexity Tracking

> No Constitution Check violations — not applicable. All gates pass without justification.