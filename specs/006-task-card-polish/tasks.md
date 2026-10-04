# Tasks: Task Card Polish

**Input**: Design documents from `/specs/006-task-card-polish/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: TDD is mandatory per the constitution (IV. Test-First). Every user story writes
failing tests first (red), then implements (green), then refactors.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing
of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

All paths below are relative to `modules/procrastinator-tracker/frontend/`. Tests live in the
module's `tests/` dir; source in `src/`. No backend/MCP changes.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the baseline is green and the working files match the plan.

- [X] T001 Verify the workspace is installed and the procrastinator-tracker frontend baseline gates
      pass: `pnpm --filter @sousa99/procrastinator-tracker-components test`, `typecheck`, `lint`
- [X] T002 [P] Read `specs/006-task-card-polish/plan.md` + `research.md` and confirm the target files
      (`src/components/task/TaskDeck.tsx`, `src/components/task/TaskDeckWrapper.tsx`,
      `src/components/ui/deck/deck.tsx`, `src/index.ts`, `tests/task-deck.test.tsx`,
      `tests/task-deck-wrapper.test.tsx`) match their current on-disk state

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared helper that both published levels need before US1 can land.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Extract the `hasActiveFilters` helper out of `src/components/task/TaskDeckWrapper.tsx`
      into a shared module `src/lib/taskFilters.ts` and export it; update `TaskDeckWrapper.tsx` to
      import it from there (no behavior change)

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Visible Empty State (Priority: P1) 🎯 MVP

**Goal**: When there are no tasks to display, both published levels (`TaskDeck`, `TaskDeckWrapper`)
render a visible card-styled empty state with a friendly message instead of blank space / a bare
`<p>` (spec FR-001/FR-002/FR-008).

**Independent Test**: Render `TaskDeck` with `tasks={[]}` and with a fully-filtered-out set; render
`TaskDeckWrapper` with a `dataSource` resolving to `[]`. In all three cases a card with
`data-testid="task-deck-empty"` and the message `No tasks yet.` / `No tasks match these filters.`
is visible, and it disappears as soon as a task matches again.

### Tests for User Story 1 (write FIRST, ensure they FAIL before implementation) ⚠️

- [X] T004 [US1] Write failing tests in `tests/task-deck.test.tsx`: (a) `TaskDeck` with `tasks={[]}`
      renders the empty card (`task-deck-empty`, text `No tasks yet.`) and not `null`;
      (b) `TaskDeck` with `filters={{ status: 'finished' }}` on a set where none match renders the
      empty card with `No tasks match these filters.`
- [X] T005 [US1] Write a failing test in `tests/task-deck-wrapper.test.tsx`: with a `dataSource`
      resolving to `[]`, the wrapper renders `TaskDeckEmpty` (message still matches
      `/No tasks yet/i`, as in the existing test at line 49)

### Implementation for User Story 1

- [X] T006 [US1] Create `src/components/task/TaskDeckEmpty.tsx` — a card-styled empty state
      (rounded border/bg like `Card`, an icon from `lucide-react`, and a message) accepting a
      `message` prop and `data-testid="task-deck-empty"`; reuse `cn` from `src/lib/utils.ts`
- [X] T007 [US1] In `src/components/task/TaskDeck.tsx`, replace `if (visible.length === 0) return null;`
      with a render of `TaskDeckEmpty` inside the existing `Deck` stage (message chosen via the
      shared `hasActiveFilters` from `src/lib/taskFilters.ts`); the empty card must keep the same
      stage height so layout does not collapse
- [X] T008 [US1] In `src/components/task/TaskDeckWrapper.tsx`, replace the bare empty `<p>` block
      (lines ~114-118) with the shared `TaskDeckEmpty`, keeping the exact message texts and the
      `hasActiveFilters` branch; keep the `loading` state text as-is
- [X] T009 [P] [US1] Add `TaskDeckEmpty` to `src/index.ts` as an additive export (with a
      `TaskDeckEmptyProps` type if props are introduced); do not remove or rename any existing export
- [X] T010 [P] [US1] Add an `Empty` story to `src/components/task/TaskDeck.stories.tsx`
      (`tasks={[]}`) and to `src/components/task/TaskDeckWrapper.stories.tsx`
      (`dataSource: async () => []`)

**Checkpoint**: User Story 1 fully functional and testable independently — run the deck and wrapper
test suites; both must be green.

---

## Phase 4: User Story 2 - Gentler Transition Animation (Priority: P2)

**Goal**: A new opt-in `transitionVariant: 'gentle'` reduces the exiting card's sideways travel
while `'slide'` (default) reproduces today's ±500px pan exactly (spec FR-003/FR-004/FR-005).

**Independent Test**: With `transitionVariant="gentle"`, `resolveExitTravel` returns `80`; with the
default, it returns `500`. The wrapper forwards the variant to the inner deck. Manual swipes still
dismiss cards left/right in both variants.

### Tests for User Story 2 (write FIRST, ensure they FAIL before implementation) ⚠️

- [X] T011 [P] [US2] Write failing tests in a new `tests/task-transition.test.ts`: `resolveExitTravel`
      returns `500` for `'slide'` (and for no/undefined input) and `80` for `'gentle'`
- [X] T012 [US2] Write a failing test in `tests/task-deck-wrapper.test.tsx`: `transitionVariant`
      is forwarded to the inner `TaskDeck` (e.g. render with `transitionVariant="gentle"` and assert
      the deck receives the resolved travel / variant)

### Implementation for User Story 2

- [X] T013 [US2] Add an `exitTravel?: number` prop (default `500`) to `DeckCards` and thread it to
      `DeckCard` in `src/components/ui/deck/deck.tsx`; use it for `exitX` (left `-exitTravel`,
      right `exitTravel` at ~lines 245-251) so the current default is bit-for-bit unchanged
- [X] T014 [P] [US2] Create `src/lib/taskTransition.ts` exporting `TransitionVariant` type and
      `resolveExitTravel(variant: TransitionVariant): number` (`'slide' → 500`, `'gentle' → 80`)
- [X] T015 [US2] Add `transitionVariant?: 'slide' | 'gentle'` (default `'slide'`) to `TaskDeckProps`
      in `src/components/task/TaskDeck.tsx` and pass `exitTravel={resolveExitTravel(transitionVariant)}`
      to `DeckCards`; default must reproduce current behavior
- [X] T016 [US2] Add `transitionVariant?: 'slide' | 'gentle'` (default `'slide'`) to
      `src/components/task/TaskDeckWrapper.tsx` and forward it to the inner `TaskDeck`
- [X] T017 [P] [US2] Add `Gentle` and `Slide` (default) stories to `src/components/task/TaskDeck.stories.tsx`
      and a `Gentle` story to `src/components/task/TaskDeckWrapper.stories.tsx`, with `transitionVariant`
      in the `argTypes` of both

**Checkpoint**: User Stories 1 AND 2 both work independently — `tests/task-transition.test.ts`,
deck, and wrapper suites green.

---

## Phase 5: User Story 3 - Compact Default Size (Priority: P2)

**Goal**: The deck stage defaults to a compact `16rem` height (applied via CSS var `--deck-height`)
that consumers can grow through the existing `style`/`className` surface — no new sizing API
(spec FR-006/FR-007, Assumptions).

**Independent Test**: The stage carries `--deck-height: 16rem` by default; passing
`style={{ '--deck-height': '24rem' }}` produces a larger stage; long descriptions stay truncated.

### Tests for User Story 3 (write FIRST, ensure they FAIL before implementation) ⚠️

- [X] T018 [US3] Write failing tests in `tests/task-deck.test.tsx`: (a) the stage element
      renders with inline `--deck-height: 16rem`; (b) passing `style={{ '--deck-height': '24rem' }}`
      overrides it (consumer style wins over the default)

### Implementation for User Story 3

- [X] T019 [US3] In `src/components/task/TaskDeck.tsx`, replace the stage's fixed height classes
      (`h-[24rem] w-full sm:h-[26rem]` at ~line 122) with `h-[var(--deck-height)] w-full` and an
      inline `--deck-height: 16rem` default, merged so a consumer-supplied `style` wins (e.g.
      `style={{ '--deck-height': '16rem', ...style }}`); add `style?: CSSProperties` to `TaskDeckProps`
      and forward it to `Deck`
- [X] T020 [P] [US3] Add `style?: CSSProperties` passthrough to `src/components/task/TaskDeckWrapper.tsx`
      (root container currently takes only `className`) so consumers can size/space the wrapper
- [X] T021 [P] [US3] Add a `Compact` story (default) and an `Override size` story
      (`style={{ '--deck-height': '24rem' }}`) to `src/components/task/TaskDeck.stories.tsx`; add a
      `style` argType entry to `TaskDeckWrapper.stories.tsx`

**Checkpoint**: All user stories independently functional — deck + wrapper + transition suites green.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, validation, and final gates across all stories.

- [X] T022 [P] Update the workbench docs `src/components/task/TaskDeck.mdx` and
      `src/components/task/TaskDeckWrapper.mdx` to document the empty state, `transitionVariant`,
      and compact sizing + `--deck-height` override
- [X] T023 Run the `specs/006-task-card-polish/quickstart.md` validation scenarios end-to-end
      (component tests, Storybook stories, `build:lib` export check)
- [X] T024 Run the full gate suite from the repo root: `pnpm lint && pnpm format && pnpm typecheck && pnpm test`

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
- **User Story 2 (P2)**: Depends on Foundational. No dependencies on US1/US3.
- **User Story 3 (P2)**: Depends on Foundational. No dependencies on US1/US2.

> **Note**: US2 and US3 both modify `src/components/task/TaskDeck.tsx` (T015 and T019). They can be
> **planned in parallel** but must be **implemented/merged sequentially** (or coordinated on the
> same branch) to avoid conflicting edits to that file. Their test files are separate
> (`tests/task-transition.test.ts` vs `tests/task-deck.test.tsx`), so the red-phase tests can be
> written in parallel.

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD, constitution IV)
- Primitive first (T013 exitTravel) before the published mapping (T015 transitionVariant)
- Implementation before stories/integration
- Story complete before moving to the next priority

### Parallel Opportunities

- Setup T001/T002 marked [P] can run in parallel
- Test tasks across different files marked [P] run in parallel (T011 vs T012; T018 vs US1 tests)
- Story implementation tasks marked [P] run in parallel when they touch different files
  (e.g. T006 vs T009 vs T010; T013 vs T014; T019 vs T020 vs T021)
- US1, US2, and US3 tests can be written in parallel; implementation should be sequenced for the
  shared `TaskDeck.tsx` file

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Write failing tests in tests/task-deck.test.tsx for the empty state"
Task: "Write failing test in tests/task-deck-wrapper.test.tsx for the empty state"

# Launch independent implementation files together (after tests go red):
Task: "Create src/components/task/TaskDeckEmpty.tsx"
Task: "Add TaskDeckEmpty to src/index.ts"
Task: "Add Empty stories to TaskDeck.stories.tsx and TaskDeckWrapper.stories.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (T003 - `hasActiveFilters` shared helper)
3. Complete Phase 3: User Story 1 (empty state at both published levels)
4. **STOP and VALIDATE**: run `tests/task-deck.test.tsx` + `tests/task-deck-wrapper.test.tsx` green
5. Deploy/demo if ready — this alone removes the "blank widget" confusion in dashboards

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (empty state) → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 (gentle transition) → Test independently → Deploy/Demo
4. Add User Story 3 (compact size + override) → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (empty state)
   - Developer B: User Story 2 tests + `deck.tsx`/`taskTransition.ts` (T011-T014)
   - Developer C: User Story 3 tests + wrapper/style tasks (T018, T020-T021)
3. Sequence the shared `TaskDeck.tsx` edits (T015, T019) last, in order

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Verify tests fail before implementing (constitution IV - red → green → refactor)
- Commit after each task or logical group (delegate to `github-helper`)
- Stop at any checkpoint to validate the story independently
- Backend, MCP, and the `WidgetStatusBar` (from `005`) are out of scope and must not change

## Revision (post-implementation)

- **2026-10-04 — US2 revised**: the original `gentle` variant (80px horizontal exit) was replaced by
  **`slide-up`** (`transitionVariant: 'slide' | 'slide-up'`). The published API now maps
  `'slide' → exitPreset { x: 500, y: 0 }` and `'slide-up' → exitPreset { x: 0, y: -48 }` (vertical
  exit, no sideways travel — better fit for dense side-by-side dashboards). The raw deck prop is
  `exitPreset: { x, y }` instead of `exitTravel`. Tests, stories, docs, and the changeset wording
  were updated to match; the 80px `gentle` variant was removed before the PR merged.