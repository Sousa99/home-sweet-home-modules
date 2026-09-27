---

description: "Task list for the Current Time Dashboard feature (clarified scope)"

---

# Tasks: Current Time Dashboard

**Input**: Design documents from `/specs/003-current-time-dashboard/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Included. This repository's constitution (Principle IV, Test-First, NON-NEGOTIABLE) mandates TDD via Vitest for frontend work, and `quickstart.md` defines the test scenarios. Each user-story phase therefore leads with failing tests (RED) before implementation (GREEN).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. A first implementation pass exists for the pre-clarification scope (dark theme, single readout); this task list converges the module on the clarified scope: shared light amber/slate style, two published widgets (`ClockCard`/`ClockPlain`) with identical props (align, defaultFormat, switchable, aspectRatio) that fill available space and scale, and a Storybook workbench with `.mdx` docs.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- New module lives under `modules/current-time/frontend/` per plan.md (frontend-only module; no backend).
- App source: `modules/current-time/frontend/src/`; tests: `modules/current-time/frontend/tests/`; Storybook: `modules/current-time/frontend/.storybook/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Adapt the existing scaffold to the clarified scope — shared light theme, `cn` helper, `ui/card.tsx` primitives, and the Storybook workbench used by the other modules.

- [X] T001 Retheme `modules/current-time/frontend/src/index.css` to the shared light amber/slate palette (remove the dark navy clock theme; define amber/slate tokens; keep the Tailwind v4 entry)
- [X] T002 [P] Create the `cn` helper in `modules/current-time/frontend/src/lib/utils.ts` matching the other modules (filter truthy classes, join with spaces)
- [X] T003 [P] Add `.storybook/main.ts` (stories glob `../src/**/*.mdx` + `../src/**/*.stories.@(ts|tsx)`, `@storybook/addon-docs`, `@tailwindcss/vite` plugin in `viteFinal`) and `.storybook/preview.ts` importing `../src/index.css`
- [X] T004 [P] Add Storybook to `modules/current-time/frontend/package.json`: devDependencies `@storybook/react-vite` (^9) and `@storybook/addon-docs` (^9), scripts `storybook` (`storybook dev -p 6006`) and `build-storybook` (`storybook build -o dist-storybook`)
- [X] T005 [P] Add `modules/current-time/frontend/src/components/ui/card.tsx` primitives (`Card`, `CardHeader`, `CardTitle`, `CardContent`) in the shared light style (`rounded-xl border border-amber-200/70 bg-white p-4 shadow-sm`) using `cn`
- [X] T006 Add `.storybook` to the `include` list in `modules/current-time/frontend/tsconfig.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The format-state logic shared by the dashboard and both widgets (seed from stored preference or `defaultFormat`; persist only when `switchable`). MUST complete before any user story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T007 [P] Write failing unit tests for `useClockFormat` in `modules/current-time/frontend/tests/use-clock-format.test.ts` — initial format is stored value when `switchable` (else `defaultFormat`); format is pinned to `defaultFormat` when `switchable={false}`; `setFormat` persists only when `switchable` (RED)
- [X] T008 [P] Extend `modules/current-time/frontend/tests/time-format.test.ts` for `getTimeFormat(fallback)` — returns the stored value if valid, otherwise the supplied fallback (RED)
- [X] T009 Implement `getTimeFormat(fallback: TimeFormat = '24h'): TimeFormat` in `modules/current-time/frontend/src/lib/timeFormat.ts` (GREEN, satisfies T008)
- [X] T010 Implement the internal `useClockFormat({ defaultFormat, switchable })` hook in `modules/current-time/frontend/src/lib/useClockFormat.ts` returning `{ format, setFormat }` — initial = `switchable ? getTimeFormat(defaultFormat) : defaultFormat`; `setFormat` persists only when `switchable` (GREEN, satisfies T007)

**Checkpoint**: Foundation ready — format semantics proven. User story implementation can now begin.

---

## Phase 3: User Story 1 - Live Time Display (Priority: P1) 🎯 MVP

**Goal**: The live local time as hours : minutes : seconds, advancing every second and self-correcting (no drift), in the shared light style. Matches spec FR-001, FR-002, FR-003.

**Independent Test**: Open the dev server, observe seconds advancing once per second and minutes/hours advancing at boundaries; compare against the device clock; background the tab, return, and see the readout immediately correct.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T011 [P] [US1] Write/adjust component tests for `ClockFace` in `modules/current-time/frontend/tests/clock-face.test.tsx` — renders hours, minutes, and seconds from a `TimeParts` prop with clear separation, and AM/PM only in 12-hour mode (RED)
- [X] T012 [US1] Verify the ticking/resync tests in `modules/current-time/frontend/tests/use-current-time.test.ts` still pass for `useCurrentTime` (ticking, boundary advance, `visibilitychange`/`focus` resync, unmount cleanup)

### Implementation for User Story 1

- [X] T013 [US1] Restyle `ClockFace` in `modules/current-time/frontend/src/components/clock/ClockFace.tsx` to the shared light theme (large, legible tabular-nums readout with amber accents) keeping it pure — takes `time: TimeParts` (GREEN, satisfies T011)

**Checkpoint**: User Story 1 is fully functional and testable independently — the MVP is complete.

---

## Phase 4: User Story 2 - Dashboard Presentation (Priority: P1)

**Goal**: The dashboard presents the time in the shared light amber/slate style of the other modules — white cards, amber accents — coherent and readable on desktop and mobile, composing the card widget. Matches spec FR-005, FR-006, FR-015.

**Independent Test**: Open the page on desktop and a mobile-width viewport; confirm the layout is balanced, uses the shared light style (compare against another module), and the time is prominent; `dashboard.test.tsx` asserts the structure.

### Tests for User Story 2 ⚠️

- [X] T014 [P] [US2] Write failing dashboard tests in `modules/current-time/frontend/tests/dashboard.test.tsx` — `DashboardPage` renders a clock readout (`data-testid="clock"`) and the format control, and renders without error (RED)

### Implementation for User Story 2

- [X] T015 [US2] Rebuild `DashboardPage` in `modules/current-time/frontend/src/pages/DashboardPage.tsx` in the shared light style composing `ClockCard` (center-aligned, switchable) plus a header (GREEN, satisfies T014)
- [X] T016 [US2] Route `DashboardPage` as the default route in `src/App.tsx` (react-router) and apply the light theme via `src/index.css`

**Checkpoint**: User Stories 1 AND 2 both work independently.

---

## Phase 5: User Story 3 - Embeddable Clock Widgets (Priority: P1)

**Goal**: Two published widgets — `ClockCard` (card chrome) and `ClockPlain` (no card chrome) — with identical props `align` (`left`/`center`/`right`), `defaultFormat` (`'12h'`/`'24h'`), `switchable` (boolean), and optional `aspectRatio`; they self-contain the live time, fill available width/height with the readout scaling to fit, and honor an optional aspect ratio. Matches spec FR-010…FR-013, FR-016, FR-017, SC-006…SC-008, SC-010.

**Independent Test**: Render each widget inside arbitrary containers; set every prop and verify: identical readouts (chrome differs), alignment honored, default format seeded (AM/PM in 12h), `switchable={false}` hides the toggle and pins the format, resize fills the space and scales the text, and `aspectRatio` constrains proportions.

### Tests for User Story 3 ⚠️

- [X] T017 [P] [US3] Write failing widget tests in `modules/current-time/frontend/tests/clock-widget.test.tsx` — ClockCard and ClockPlain render identical readouts (chrome differs); `align` left/center/right honored; `defaultFormat` seeds 12h/24h; `switchable` true shows toggle / false hides it; widget fills its container with the readout scaling; `aspectRatio` constrains proportions (RED)

### Implementation for User Story 3

- [X] T018 [US3] Implement the internal `ClockWidget` core in `modules/current-time/frontend/src/components/clock/ClockWidget.tsx` — composes `ClockFace` + optional `TimeFormatToggle` (via `useClockFormat`), applies `align`, and implements fill-and-scale sizing (container-measured font scaling with a legibility clamp, per research.md R-008) (GREEN, satisfies T017)
- [X] T019 [P] [US3] Implement `ClockCard` in `modules/current-time/frontend/src/components/clock/ClockCard.tsx` — `ClockWidget` wrapped in the shared `ui/Card` chrome; props `align`, `defaultFormat`, `switchable`, `aspectRatio`
- [X] T020 [P] [US3] Implement `ClockPlain` in `modules/current-time/frontend/src/components/clock/ClockPlain.tsx` — `ClockWidget` with no card chrome; identical props to `ClockCard`

**Checkpoint**: User Stories 1, 2, AND 3 all work independently — the publishable widgets are complete.

---

## Phase 6: User Story 4 - Time Format Preference (Priority: P2)

**Goal**: Switch between 12-hour and 24-hour when `switchable`; the choice is remembered across visits (shared storage key `current-time:time-format`, default 24-hour, invalid fallback). Matches spec FR-007, FR-008, FR-013, SC-005, SC-008, and the persisted-preference contract.

**Independent Test**: With a switchable widget, toggle 12h ⇄ 24h, confirm immediate update (AM/PM in 12h) and persistence across reload; confirm a non-switchable widget shows no toggle and stays on `defaultFormat`.

### Tests for User Story 4 ⚠️

- [X] T021 [P] [US4] Write failing toggle + persistence tests in `modules/current-time/frontend/tests/time-format-toggle.test.tsx` — toggle reflects and persists the format; when `switchable={false}` no toggle is rendered and the format stays pinned (RED)

### Implementation for User Story 4

- [X] T022 [US4] Restyle `TimeFormatToggle` in `modules/current-time/frontend/src/components/clock/TimeFormatToggle.tsx` to the shared light theme (amber accent, `aria-pressed`) (GREEN, satisfies T021)
- [X] T023 [US4] Wire format persistence through `useClockFormat` in the widgets and `DashboardPage` — changes apply immediately and persist under `current-time:time-format` (invalid stored values fall back)

**Checkpoint**: All user stories through US4 are now independently functional.

---

## Phase 7: User Story 5 - Component Workbench & Documentation (Priority: P2)

**Goal**: An interactive workbench previewing every widget presentation and a written `.mdx` documentation page, following the other modules' Storybook conventions. Matches spec FR-014, SC-009.

**Independent Test**: Run `pnpm --filter ./modules/current-time/frontend storybook`, browse the widget stories (card/plain × align × defaultFormat × switchable × aspectRatio) and the `Clock.mdx` docs page.

### Tests/Stories for User Story 5 ⚠️

- [X] T024 [P] [US5] Add `ClockCard.stories.tsx` and `ClockPlain.stories.tsx` in `modules/current-time/frontend/src/components/clock/` previewing align × defaultFormat × switchable × aspectRatio (card/plain variants)
- [X] T025 [P] [US5] Add `DashboardPage.stories.tsx` in `modules/current-time/frontend/src/pages/`
- [X] T026 [US5] Write `Clock.mdx` in `modules/current-time/frontend/src/components/clock/` using `Meta`/`Canvas`/`ArgTypes` from `@storybook/addon-docs/blocks` documenting `ClockCard` and `ClockPlain` (props, variants, examples)

**Checkpoint**: All user stories are now independently functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Library surface, documentation, release hygiene, and gate verification affecting the whole module.

- [X] T027 [P] Update the public library surface in `modules/current-time/frontend/src/index.ts` to export `ClockCard`, `ClockPlain`, `ClockFace`, `TimeFormatToggle`, `DashboardPage`, `useCurrentTime`, `formatTimeParts`, `getTimeFormat`, `setTimeFormat`, and the `TimeFormat`/`TimeParts`/widget prop types per `contracts/frontend-api.md`
- [X] T028 [P] Update module documentation under `modules/current-time/`: `README.md`, `setup.md`, and `AGENTS.md` for the shared light style, the two widgets (props incl. `aspectRatio`), and the Storybook commands
- [X] T029 [P] Update the changeset for `@sousa99/current-time-components` to cover the clarified scope (two widgets, alignment, switchable format, fill/scale + aspect ratio, workbench/docs)
- [X] T030 Run `quickstart.md` end-to-end validation: `pnpm --filter ./modules/current-time/frontend typecheck`, `test`, repo-wide `pnpm lint` and `pnpm format`, `build`, `build:lib`, `build-storybook`, plus dev-server and Storybook smoke checks
- [X] T031 Final constitution & gate review: identity matches directory/package names, shared presets extended (no config drift), light-style parity with the other modules, changesets fixed group registered, frontend-only scope documented

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories (`useClockFormat` + `timeFormat` are imported by the widgets and the dashboard)
- **User Stories (Phase 3+)**: All depend on Foundational completion
  - US1 (readout) and US2 (dashboard) proceed in parallel after Foundation
  - US3 (widgets) depends on US1's `ClockFace`/`useClockFormat`; US2 depends on US3's `ClockCard` (DashboardPage composes it)
  - US4 depends on US3's widgets (toggle lives inside the widgets); US5 depends on US3's widgets
- **Polish (Final Phase)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: After Foundational — no dependencies on other stories (MVP)
- **User Story 2 (P1)**: After Foundational + US3 (`ClockCard`) — independently testable via `dashboard.test.tsx`
- **User Story 3 (P1)**: After Foundational + US1 (`ClockFace`, `useClockFormat`) — independently testable
- **User Story 4 (P2)**: After US3 — independently testable via its own tests
- **User Story 5 (P2)**: After US3 (+ US2 for the dashboard story) — independently testable via the workbench

### Within Each User Story

- Tests MUST be written and FAIL (RED) before implementation (GREEN)
- Tests before components; components before page integration
- Story complete before moving to next priority

### Parallel Opportunities

- Setup tasks T002–T006 run in parallel after T001
- Foundational tests T007/T008 run in parallel; implementations T009/T010 sequence after
- US1 and US3 initial work can proceed in parallel (ClockFace vs widget core), then US2 after `ClockCard`
- US3 widget tests T017 run first; implementations T018 (core) → T019/T020 (thin wrappers, parallel)
- US4 (T021–T023) and US5 (T024–T026) can run in parallel after US3
- Polish tasks T027–T029 run in parallel; T030/T031 sequence after

---

## Parallel Example: User Story 3

```bash
# RED phase first:
Task: "Write failing widget tests in modules/current-time/frontend/tests/clock-widget.test.tsx"

# Then the shared core, then the two thin wrappers in parallel:
Task: "Implement the internal ClockWidget core in src/components/clock/ClockWidget.tsx"
Task: "Implement ClockCard in src/components/clock/ClockCard.tsx"
Task: "Implement ClockPlain in src/components/clock/ClockPlain.tsx"
```

## Parallel Example: User Story 5

```bash
Task: "Add ClockCard.stories.tsx and ClockPlain.stories.tsx in src/components/clock/"
Task: "Add DashboardPage.stories.tsx in src/pages/"
Task: "Write Clock.mdx in src/components/clock/"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (light theme, cn, card primitives, Storybook config)
2. Complete Phase 2: Foundational (`useClockFormat` + `getTimeFormat` fallback)
3. Complete Phase 3: User Story 1 — live hours : minutes : seconds ticking readout in light style
4. **STOP and VALIDATE**: run `pnpm --filter ./modules/current-time/frontend test` + `typecheck`; open the dev server and confirm live seconds, boundaries, and resync
5. Deploy/demo if ready — the live-time dashboard core is delivered

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 3 (widgets) → then User Story 2 (dashboard on the card widget) → Test → Deploy/Demo
4. Add User Story 4 (format preference) → Test independently → Deploy/Demo
5. Add User Story 5 (workbench + `.mdx` docs) → Test independently → Deploy/Demo
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (readout)
   - Developer B: User Story 3 core (widgets) → then User Story 4 (toggle) + User Story 5 (stories/mdx)
   - Developer C: after `ClockCard` exists → User Story 2 (dashboard)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Tests are mandatory per constitution Principle IV (Test-First) and the scenarios in `quickstart.md`
- Contract coverage: `time-format.test.ts`/`use-clock-format.test.ts` verify the persistence contract; `clock-widget.test.tsx`/`clock-face.test.tsx`/`dashboard.test.tsx`/`time-format-toggle.test.tsx` verify the component surface in `contracts/frontend-api.md`
- Existing pre-clarification files (dark theme) are converged in place (T001, T012/T013, T015, T022) rather than duplicated
- Verify tests fail before implementing; commit after each task or logical group
- Stop at any checkpoint to validate the story independently
- Avoid: vague tasks, same-file conflicts, cross-story dependencies that break independence