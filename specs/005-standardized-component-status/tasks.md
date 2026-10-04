---

description: "Task list for Standardized Component Status implementation"
---

# Tasks: Standardized Component Status

**Input**: Design documents from `/specs/005-standardized-component-status/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/status-bar.md, quickstart.md

**Tests**: Tests ARE required for this feature — the repository constitution (Principle IV) makes test-first TDD non-negotiable. Every behavior change starts with failing Vitest tests, then implementation, then a green run.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. The three P1 behaviors (last-update time, refresh, updating indicator) are all provided by the single shared `WidgetStatusBar`; each user-story phase therefore integrates the complete bar into one module's published widgets, keeping phases independent and free of same-file conflicts.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Shared package: `packages/components/src/...`
- fly-over-tracker module: `modules/fly-over-tracker/frontend/src/...`
- bus-catcher module: `modules/bus-catcher/frontend/src/...`
- procrastinator-tracker module: `modules/procrastinator-tracker/frontend/src/...`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold the new workspace-internal shared package `@sousa99/homesweethome-components` (private, NOT versioned/published — see `research.md` §2).

- [ ] T001 Create `packages/components/package.json` — name `@sousa99/homesweethome-components`, `private: true`, `version: 0.0.1` (workspace version), `type: module`, `engines.node >=24`, scripts `test` (`vitest run`) and `typecheck` (`tsc --noEmit`); NO `publishConfig`, NO changesets entry
- [ ] T002 Create `packages/components/eslint.config.mjs`, `packages/components/prettier.config.mjs`, and `packages/components/tsconfig.json` extending the `@sousa99/homesweethome-config` presets (tsconfig adds `DOM`, `DOM.Iterable`, `jsx: react-jsx`, `types: ["vite/client"]`, `noEmit: true`)
- [ ] T003 [P] Create `packages/components/vitest.config.ts` (jsdom environment, `@vitejs/plugin-react`, setup files) matching the module frontend test setups

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared `WidgetStatusBar` + `formatLastUpdated` that ALL user stories depend on. Also wire the consuming modules (devDependency + Tailwind `@source`).

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 [P] Write FAILING tests for `formatLastUpdated` in `packages/components/src/__tests__/formatLastUpdated.test.ts` — `null` → `"Not updated yet"`; a timestamp → device-local 24h `HH:MM:SS` (zero-padded) matching the device clock
- [ ] T005 [P] Write FAILING tests for `WidgetStatusBar` in `packages/components/src/__tests__/WidgetStatusBar.test.tsx` — renders `Last updated HH:MM:SS`; renders `Not updated yet` when `lastUpdatedAt` is null; shows the updating indicator ONLY while `updating`; disables the Refresh control while `updating`; calls `onRefresh` on press; surfaces `error` while keeping the last time; a11y `role="status"`/`role="alert"`/`aria-live="polite"` per `contracts/status-bar.md`
- [ ] T006 Implement `formatLastUpdated` in `packages/components/src/formatLastUpdated.ts` (make T004 green)
- [ ] T007 Implement `WidgetStatusBar` in `packages/components/src/WidgetStatusBar.tsx` with `WidgetStatusBarProps` (`lastUpdatedAt: number | null`, `updating?: boolean`, `error?: string | null`, `onRefresh?: () => void`, `className?: string`); wording `Last updated`, `Not updated yet`, `Updating…`, `Refresh` exactly per `contracts/status-bar.md` (make T005 green)
- [ ] T008 Create `packages/components/src/index.ts` exporting `WidgetStatusBar`, `WidgetStatusBarProps`, and `formatLastUpdated` (the full published surface)
- [ ] T009 [P] Add `"@sousa99/homesweethome-components": "workspace:*"` as a **devDependency** (not a runtime dependency) in `modules/fly-over-tracker/frontend/package.json`, `modules/bus-catcher/frontend/package.json`, and `modules/procrastinator-tracker/frontend/package.json` — it must be bundled, never advertised to consumers
- [ ] T010 [P] Add `@source "../../../packages/components/src";` to `modules/fly-over-tracker/frontend/src/index.css`, `modules/bus-catcher/frontend/src/index.css`, and `modules/procrastinator-tracker/frontend/src/index.css` so Tailwind v4 emits the bar's utility classes in each module's stylesheet
- [ ] T011 Run `pnpm install` and `pnpm --filter @sousa99/homesweethome-components test` — shared package tests green and the workspace links the dependency

**Checkpoint**: Foundation ready — the shared status bar exists and is consumable; user story implementation can now begin in parallel.

---

## Phase 3: User Story 1 - Last-Update Status on Every Data Widget (Priority: P1) 🎯 MVP

**Goal**: Integrate the complete shared status bar (last-update time + indicator + Refresh) into the five published fly-over-tracker widgets, replacing the count/status header. Delivers US1 (and, for this module, US2/US3) acceptance criteria.

**Independent Test**: Open each fly-over widget in Storybook — each shows `Last updated {HH:MM:SS}` (or `Not updated yet` before first load), the time advances on a new successful load, and no count/status sentence remains in the header.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T012 [US1] Write FAILING tests in `modules/fly-over-tracker/frontend/src/components/__tests__/FlyOverWidget.test.tsx`, `FlyOverMapCard.test.tsx`, `FlyOverListCard.test.tsx`, `FlyOverClosestPanel.test.tsx`, and `ClosestAircraftCard.test.tsx` — each asserts the standardized status area renders (`Last updated`, `Not updated yet` before first load, indicator while fetching, Refresh triggers refetch) and that the old count sentence is gone
- [ ] T013 [US1] Write FAILING test in `modules/fly-over-tracker/frontend/src/hooks/__tests__/useFlyOversQuery.test.tsx` asserting the hook result exposes `dataUpdatedAt` (epoch ms of last successful data, null before first load)

### Implementation for User Story 1

- [ ] T014 [US1] Extend `useFlyOversQuery` in `modules/fly-over-tracker/frontend/src/hooks/useFlyOversQuery.ts` to return `dataUpdatedAt` from TanStack Query (`query.dataUpdatedAt`, `null` before first data) — make T013 green
- [ ] T015 [P] [US1] In `modules/fly-over-tracker/frontend/src/components/FlyOverWidget.tsx`, replace the count/status header (`Aircraft over …` line, `UpdatingIndicator`, `Refresh` button) with `<WidgetStatusBar lastUpdatedAt={dataUpdatedAt} updating={isFetching} error={isError ? error?.message ?? 'Something went wrong.' : null} onRefresh={refetch} />`
- [ ] T016 [P] [US1] Same replacement in `modules/fly-over-tracker/frontend/src/components/FlyOverMapCard.tsx`
- [ ] T017 [P] [US1] Same replacement in `modules/fly-over-tracker/frontend/src/components/FlyOverListCard.tsx`
- [ ] T018 [P] [US1] Same replacement in `modules/fly-over-tracker/frontend/src/components/FlyOverClosestPanel.tsx`
- [ ] T019 [P] [US1] Same replacement in `modules/fly-over-tracker/frontend/src/components/ClosestAircraftCard.tsx`
- [ ] T020 [US1] Remove the now-unused `modules/fly-over-tracker/frontend/src/components/UpdatingIndicator.tsx` and its test `modules/fly-over-tracker/frontend/src/components/__tests__/UpdatingIndicator.test.tsx` (not part of the published surface)
- [ ] T021 [US1] Run `pnpm --filter @sousa99/fly-over-tracker-components test` and `pnpm --filter @sousa99/fly-over-tracker-components typecheck` — green

**Checkpoint**: User Story 1 fully functional and testable independently (MVP for the reference module).

---

## Phase 4: User Story 2 - Manual Refresh on Every Data Widget (Priority: P1)

**Goal**: Integrate the complete status bar into bus-catcher's published `StopCard`, giving it a last-update time, a working manual Refresh, and the updating indicator.

**Independent Test**: Open the `StopCard` Storybook story with a mock fetcher — the card shows `Last updated {time}`, pressing `Refresh` triggers a new fetch that advances the time, and `Updating…` appears while loading.

### Tests for User Story 2 ⚠️

- [ ] T022 [US2] Write FAILING tests in `modules/bus-catcher/frontend/src/components/StopCard.test.tsx` — asserts the status area renders (`Last updated`, `Not updated yet` before first load), pressing Refresh re-runs the fetch and advances the time, and the indicator shows while loading

### Implementation for User Story 2

- [ ] T023 [US2] Extend the `LoadState` in `modules/bus-catcher/frontend/src/components/StopCard.tsx` with `lastUpdatedAt: number` on `ready` (set `Date.now()` on each successful load) and an in-flight flag; add a refresh action that re-runs the current `load()` immediately (existing `refetchIntervalMs` polling stays)
- [ ] T024 [US2] Render `<WidgetStatusBar lastUpdatedAt={state.kind === 'ready' ? state.lastUpdatedAt : null} updating={inFlight} error={state.kind === 'error' ? 'Stop not found in the current schedule.' : null} onRefresh={refresh} />` in the `Card` header of `modules/bus-catcher/frontend/src/components/StopCard.tsx`
- [ ] T025 [US2] Run `pnpm --filter @sousa99/bus-catcher-components test` and typecheck — green

**Checkpoint**: User Stories 1 AND 2 both work independently.

---

## Phase 5: User Story 3 - Update-In-Progress Indicator (Priority: P1)

**Goal**: Integrate the complete status bar into procrastinator-tracker's data-fetching `TaskDeckWrapper`, adding last-update time, Refresh, and the updating indicator to the published task deck.

**Independent Test**: Open the `TaskDeckWrapper` Storybook story with a mock `dataSource` — the deck shows `Last updated {time}`, `Refresh` reloads the deck, and `Updating…` shows while loading.

### Tests for User Story 3 ⚠️

- [ ] T026 [US3] Write FAILING tests in `modules/procrastinator-tracker/frontend/tests/task-deck-wrapper.test.tsx` — asserts the status area renders (`Last updated`, `Not updated yet` before first load), Refresh calls the `dataSource` again and advances the time, and the indicator shows while loading

### Implementation for User Story 3

- [ ] T027 [US3] Extend the load state in `modules/procrastinator-tracker/frontend/src/components/task/TaskDeckWrapper.tsx` with `lastUpdatedAt: number` on `success` (set on each successful load) and an in-flight flag (the existing `inFlight` ref)
- [ ] T028 [US3] Render `<WidgetStatusBar lastUpdatedAt={state.kind === 'success' ? state.lastUpdatedAt : null} updating={inFlight} error={state.kind === 'error' ? state.message : null} onRefresh={load} />` above the deck in `modules/procrastinator-tracker/frontend/src/components/task/TaskDeckWrapper.tsx`
- [ ] T029 [US3] Run `pnpm --filter @sousa99/procrastinator-tracker-components test` and typecheck — green

**Checkpoint**: All three P1 stories complete; every published data-fetching widget across all modules has the full bar.

---

## Phase 6: User Story 4 - Identical Status Across All Modules (Priority: P2)

**Goal**: Prove and document that the status bar is identical (wording, layout, behavior) across all modules, per FR-004 / SC-005.

**Independent Test**: Compare a widget story from each module in Storybook — the bars match word-for-word and are laid out identically; the module test suites assert the same status labels.

### Implementation for User Story 4

- [ ] T030 [P] [US4] Update the Storybook documentation pages to document the standardized status bar: `modules/fly-over-tracker/frontend/src/components/DashboardWidgets.mdx` (and affected widget `.mdx`), `modules/bus-catcher/frontend/src/components/StopCard.mdx`, `modules/procrastinator-tracker/frontend/src/components/task/TaskDeckWrapper.mdx`
- [ ] T031 [US4] Add cross-module consistency assertions: each widget test (fly-over x5, StopCard, TaskDeckWrapper) asserts the exact same status labels — `Last updated`, `Not updated yet`, `Updating…`, `Refresh`
- [ ] T032 [US4] Run the three module suites + shared suite together (`pnpm --filter ... test` or root `pnpm test`) and visually verify via Storybook per `quickstart.md` scenario 3 — no per-module deviations

**Checkpoint**: Cross-module consistency verified — the ecosystem reads as one product family.

---

## Phase 7: User Story 5 - Failure and Empty States (Priority: P2)

**Goal**: Degraded behavior is standardized everywhere: failed loads keep the last successful time, errors are surfaced, Refresh retries, and a never-loaded widget shows `Not updated yet` (FR-006, FR-007).

**Independent Test**: Point each widget at a failing backend/mock — the previous data and its timestamp stay visible, an error is shown in the status area, and `Refresh` recovers once the backend responds.

### Tests for User Story 5 ⚠️

- [ ] T033 [P] [US5] Write FAILING tests across the widget suites (`modules/fly-over-tracker/frontend/src/components/__tests__/*.test.tsx`, `modules/bus-catcher/frontend/src/components/StopCard.test.tsx`, `modules/procrastinator-tracker/frontend/tests/task-deck-wrapper.test.tsx`) asserting: a failed refresh keeps the previous `Last updated` time and surfaces the error; a first-load failure shows `Not updated yet` + error; pressing Refresh after a failure retries and recovers

### Implementation for User Story 5

- [ ] T034 [US5] Wire error messages into the `error` prop where missing: fly-over widgets (already via `isError`/`error?.message`), `StopCard.tsx` error branch, `TaskDeckWrapper.tsx` error branch — never fabricate a timestamp (FR-007)
- [ ] T035 [US5] Verify the shared `WidgetStatusBar` failure behavior (keeps `lastUpdatedAt`, still renders `Refresh`) is exercised by the failing-first tests and make them green
- [ ] T036 [US5] Run the full test suite (`pnpm test`) across the workspace — all green

**Checkpoint**: Failure and empty states behave identically everywhere.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Release wiring, docs, and final validation that affect the whole feature.

- [ ] T037 [P] Add changesets bumping the three module component packages (patch): `@sousa99/fly-over-tracker-components`, `@sousa99/bus-catcher-components`, `@sousa99/procrastinator-tracker-components` — the shared change ships inside them (`research.md` §2); the shared package itself gets NO changeset
- [ ] T038 [P] Update module documentation for the standardized status bar: `modules/fly-over-tracker/README.md`, `modules/bus-catcher/README.md`, `modules/procrastinator-tracker/README.md` (and `docs/` guides if the module-standard doc references widget headers)
- [ ] T039 Run the `quickstart.md` validation scenarios end-to-end (shared + module tests, Storybook consistency, SPA end-to-end, `build:lib` bundling check) and the full gates: `pnpm lint`, `pnpm format`, `pnpm typecheck`, `pnpm test`
- [ ] T040 Verify hygiene: shared package is absent from `.changeset/config.json` and has no `publishConfig`; no dead code or leftover `UpdatingIndicator` references; all packages still extend the shared presets

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational completion
  - US1 (Phase 3) → US2 (Phase 4) → US3 (Phase 5): sequential in practice because each phase consumes the same shared component in a different module — but each phase touches disjoint files, so they CAN proceed in parallel once Phase 2 is done
  - US4 (Phase 6) and US5 (Phase 7): depend on all three integration phases (US1–US3)
- **Polish (Final Phase)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational — no dependency on other stories
- **User Story 2 (P1)**: Can start after Foundational — disjoint files from US1 (bus-catcher vs fly-over-tracker)
- **User Story 3 (P1)**: Can start after Foundational — disjoint files from US1/US2 (procrastinator-tracker)
- **User Story 4 (P2)**: Depends on US1–US3 (needs all widgets integrated before consistency can be verified)
- **User Story 5 (P2)**: Depends on US1–US3 (error wiring exists per-widget)

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Implementation of the bar integration before wiring polish
- Story complete before moving to next priority

### Parallel Opportunities

- Phase 1 T003 and Phase 2 T004/T005, T009/T010: independent files
- Phase 2 T004+T005 (two test files), T009+T010 (three package.json + three css files)
- Phase 3: T015–T019 (five disjoint widget files, all after T014) run in parallel
- US1, US2, US3 integration phases touch disjoint files (different modules) — parallelizable across three developers after Phase 2
- Phase 8 T037+T038: independent

---

## Parallel Example: User Story 1

```bash
# Launch all widget swaps for User Story 1 together (after T014, the hook change):
Task: "Replace header with WidgetStatusBar in FlyOverWidget.tsx"
Task: "Replace header with WidgetStatusBar in FlyOverMapCard.tsx"
Task: "Replace header with WidgetStatusBar in FlyOverListCard.tsx"
Task: "Replace header with WidgetStatusBar in FlyOverClosestPanel.tsx"
Task: "Replace header with WidgetStatusBar in ClosestAircraftCard.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (shared package scaffold)
2. Complete Phase 2: Foundational (WidgetStatusBar + consuming-module wiring — CRITICAL)
3. Complete Phase 3: User Story 1 (fly-over-tracker widgets, the reference module)
4. **STOP and VALIDATE**: fly-over widgets show the full standardized bar in Storybook/SPA
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. Add US1 (fly-over) → test independently → demo (MVP)
3. Add US2 (bus-catcher StopCard) → test independently
4. Add US3 (procrastinator TaskDeckWrapper) → test independently
5. Add US4 (consistency) → cross-module verification
6. Add US5 (failure/empty states) → resilience verification
7. Polish: changesets, docs, full gates

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (fly-over-tracker)
   - Developer B: US2 (bus-catcher)
   - Developer C: US3 (procrastinator-tracker)
3. US4 and US5 integrate across all three modules afterwards

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable (disjoint modules)
- Verify tests fail before implementing (constitution Principle IV)
- Commit after each task or logical group (conventional commits)
- Stop at any checkpoint to validate the story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- The shared package is NEVER versioned or published — it ships bundled inside the three published module packages (`research.md` §2)