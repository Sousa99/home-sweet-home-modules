# Tasks: Status Bar Placement Outside the Card

**Input**: Design documents from `/specs/008-status-bar-placement/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: TDD is mandatory per the constitution (IV. Test-First). Every user story writes failing
tests first (red), then implements (green), then refactors.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing
of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

All paths below are relative to `modules/bus-catcher/frontend/`. Tests are colocated with source in
`src/` (repo convention). No backend/MCP changes.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the baseline is green and the working files match the plan.

- [X] T001 Verify the workspace is installed and the bus-catcher frontend baseline gates pass:
      `pnpm --filter ./modules/bus-catcher/frontend test`, `typecheck`, `lint`
- [X] T002 [P] Read `specs/008-status-bar-placement/plan.md` + `research.md` and confirm the target
      files (`src/components/StopCard.tsx`, `src/components/StopCard.test.tsx`,
      `src/components/StopCard.stories.tsx`, `src/components/StopCard.mdx`) match their current
      on-disk state (the status bar currently renders **inside** the `Card` at `StopCard.tsx`
      lines ~125-134, between `CardHeader` and `CardContent`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the regression baseline that US3 must preserve.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Confirm the current render structure in `src/components/StopCard.tsx` (the `mb-3`
      `<div>` wrapping `<WidgetStatusBar>` inside the `Card`) and that the existing status-bar
      behavior tests in `src/components/StopCard.test.tsx` (last-updated time, `Not updated yet`,
      Refresh advances the time, updating indicator, error preserves the timestamp, recovery via
      Refresh, missing state) are all green — this is the behavior baseline US3 must keep intact

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Status Bar Above the Card (Priority: P1) 🎯 MVP

**Goal**: The `StopCard` widget renders the standardized status bar **above and outside** the card:
a new root container wraps the widget, the bar is `children[0]`, and the `Card` is `children[1]`
(spec FR-001/FR-002/FR-003).

**Independent Test**: Render `StopCard` and assert the status bar (the `role="status"` live region /
`Last updated …` text) is a descendant of the widget root's first child, the card (located via
`getByRole('heading', { name: stopName }).closest('.rounded-xl')`) is a descendant of the second
child, `card.contains(statusText) === false`, and the card interior's text contains no
`Last updated` / `Not updated yet` / `Refresh` / `Updating…`.

### Tests for User Story 1 (write FIRST, ensure they FAIL before implementation) ⚠️

- [X] T004 [US1] Write failing placement tests in `src/components/StopCard.test.tsx`: (a) the status
      bar (`role="status"` or `Last updated …` text) is a descendant of
      `container.querySelector('[data-testid="stop-card-widget"]')`'s **first child**; (b) the card
      (`getByRole('heading', { name: 'Sete Rios' }).closest('.rounded-xl')`) is a descendant of the
      root's **second child**; (c) `card.contains(statusText) === false` (FR-001, FR-002)
- [X] T005 [US1] Write a failing test in `src/components/StopCard.test.tsx`: the card interior's
      `textContent` contains no `Last updated`, `Not updated yet`, `Refresh`, or `Updating…` text
      (FR-002) — and the `missing` state renders the same bar-first/card-second structure

### Implementation for User Story 1

- [X] T006 [US1] Restructure `src/components/StopCard.tsx`: wrap the whole widget in a root
      `<div data-testid="stop-card-widget" className="space-y-2">`; move `<WidgetStatusBar>` out of
      the `Card` to be the root's first child (removing the current `mb-3` wrapper div, lines
      ~125-134); the `Card` becomes the second child. Keep every `WidgetStatusBar` prop identical
      (`lastUpdatedAt`, `updating`, `error`, `onRefresh` with `undefined` when `missing`) and the
      card interior unchanged (FR-005)

**Checkpoint**: User Story 1 fully functional and testable independently — run
`src/components/StopCard.test.tsx`; placement tests green, all existing behavior tests still green.

---

## Phase 4: User Story 2 - Each Card Keeps Its Own Status Bar (Priority: P2)

**Goal**: In multi-card layouts each widget renders its own bar directly above its own card,
aligned to the card's width, and updating one card never affects another (spec FR-004/FR-006).

**Independent Test**: Render two `StopCard` widgets and assert each root
(`[data-testid="stop-card-widget"]`) contains exactly one bar above its own card; a refresh of one
widget advances only that widget's last-updated time.

### Tests for User Story 2 (write FIRST, ensure they FAIL before implementation) ⚠️

- [X] T007 [US2] Write a failing multi-widget test in `src/components/StopCard.test.tsx`: render two
      `StopCard`s (different `stopName`s), assert each widget root has its own status bar as first
      child and its own card as second child, and that triggering Refresh on one (advancing its
      `Last updated` time via a `Date.now` spy) does not change the other's displayed time
      (FR-006)

### Implementation for User Story 2

- [X] T008 [P] [US2] Add a multi-widget story to `src/components/StopCard.stories.tsx` (e.g. two
      stops rendered together, `refetchIntervalMs: 0`) demonstrating bar-above-card attribution for
      visual QA in Storybook

**Checkpoint**: User Stories 1 AND 2 both work independently — placement + multi-widget tests green.

---

## Phase 5: User Story 3 - Status Bar Behavior Unchanged (Priority: P2)

**Goal**: The move changes only position; content, wording, controls, and accessibility behavior of
the status bar are exactly as before (spec FR-005, per 005's contract).

**Independent Test**: The full existing status-bar behavior suite passes unchanged after the move
(no assertion was modified), and `StopCard.mdx` describes the bar as rendering above the card.

### Implementation for User Story 3

- [X] T009 [P] [US3] Update the "Status bar" section of `src/components/StopCard.mdx`: change
      "In the card header the widget renders…" to describe the bar rendering **above** the card as
      a separate block; keep the bullet descriptions of `Last updated`, `Updating…`, `Refresh`, and
      the failure notice unchanged
- [X] T010 [US3] Run `src/components/StopCard.test.tsx` and confirm every pre-existing status-bar
      behavior test passes **unchanged** (FR-005 regression check — none of the existing assertions
      depend on the bar being inside the card); if any assertion implicitly relied on the old DOM
      position, adjust only that assertion's selector and note it here

**Checkpoint**: All user stories independently functional — full `StopCard.test.tsx` suite green.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, validation, and final gates across all stories.

- [X] T011 [P] Run the `specs/008-status-bar-placement/quickstart.md` validation scenarios
      end-to-end (placement component tests, existing-behavior regression, Storybook multi-widget
      check, `pnpm --filter ./modules/bus-catcher/frontend build:lib` export/surface check)
- [X] T012 Run the full gate suite from the repo root: `pnpm lint && pnpm format && pnpm typecheck && pnpm test`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - US1 (P1) → US2 (P2) → US3 (P2): MVP first, then the two P2 stories
- **Polish (Final Phase)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Foundational (T003). No dependencies on US2/US3.
- **User Story 2 (P2)**: Depends on Foundational **and US1** (the widget root + placement must exist
  for per-card attribution to be observable). No dependency on US3.
- **User Story 3 (P2)**: Depends on Foundational **and US1** (behavior is verified after the move).
  No dependency on US2.

> **Note**: US1 (T004/T005), US2 (T007), and US3 (T010) all touch `src/components/StopCard.test.tsx`.
> They must be **implemented sequentially** (or coordinated on the same branch) to avoid conflicting
> edits to that file. `StopCard.tsx` (T006), `StopCard.stories.tsx` (T008), and `StopCard.mdx`
> (T009) touch different files and can run in parallel once their prerequisites land.

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD, constitution IV)
- US1: placement tests (T004/T005) red → render restructure (T006) green
- Story complete before moving to the next priority

### Parallel Opportunities

- Setup T001/T002 marked [P] can run in parallel
- T008 (stories) and T009 (mdx) marked [P] run in parallel with each other and with US1's
  implementation once the wrapper exists
- US1 tests (T004/T005) and US2 tests (T007) can be **planned** in parallel but must be
  **committed sequentially** in `StopCard.test.tsx`

---

## Parallel Example: User Story 1

```bash
# Launch the placement tests together (single file, sequential edits within it):
Task: "Write failing placement tests in src/components/StopCard.test.tsx (T004)"
Task: "Write failing status-free-card-interior test in src/components/StopCard.test.tsx (T005)"

# Launch independent implementation files together (after tests go red):
Task: "Restructure src/components/StopCard.tsx to move the status bar above the card (T006)"
Task: "Add multi-widget story to src/components/StopCard.stories.tsx (T008, US2 - different file)"
Task: "Update StopCard.mdx status-bar section wording (T009, US3 - different file)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (T003 - baseline confirmation)
3. Complete Phase 3: User Story 1 (bar moved above the card)
4. **STOP and VALIDATE**: run `src/components/StopCard.test.tsx` green (placement + existing behavior)
5. Deploy/demo if ready — this alone delivers the requested move

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (bar above card) → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 (multi-card attribution story/test) → Test independently → Deploy/Demo
4. Add User Story 3 (docs + regression verification) → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (tests + `StopCard.tsx` restructure) — the critical path
   - Developer B (after US1 lands): User Story 2 (`StopCard.stories.tsx` + multi-widget test)
   - Developer C (after US1 lands): User Story 3 (`StopCard.mdx` + regression verification)
3. Sequence the shared `StopCard.test.tsx` edits (T004/T005, T007, T010) in order

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Verify tests fail before implementing (constitution IV - red → green → refactor)
- Commit after each task or logical group (delegate to `github-helper`)
- Stop at any checkpoint to validate the story independently
- Backend, MCP, the shared `WidgetStatusBar` (from `005`), and other modules are out of scope and
  must not change; no public prop or export of `StopCard` changes (spec Assumptions)