---

description: "Task list for feature implementation"
---

# Tasks: Slow Auto-Scroll for the Closest-Flights List

**Input**: Design documents from `/specs/009-closest-flights-auto-scroll/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests ARE included — the constitution mandates Test-First (NON-NEGOTIABLE, Principle IV) and the
`test-first` skill: every behavior change starts with a failing Vitest test, then implementation, then a green run.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- All work is inside the existing package `modules/fly-over-tracker/frontend/` (see `plan.md`).
- Hook: `src/lib/useAutoScroll.ts` + tests in `src/lib/__tests__/`
- Component: `src/components/FlyOverClosestPanel.tsx` + tests in `src/components/__tests__/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

No project initialization is required — the `@sousa99/fly-over-tracker-components` package already
exists, is installed, and passes the shared gates. This phase is intentionally empty; work begins at
the Foundational phase.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The vertical auto-scroll hook — the core capability every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T001 Write FAILING unit tests for the vertical auto-scroll hook in `modules/fly-over-tracker/frontend/src/lib/__tests__/useAutoScroll.test.ts` — reuse weather-psychic's rAF driver (`vi.useFakeTimers` + 16 ms frames, `scrollTop`/`scrollHeight`/`clientHeight` fixtures): advances `scrollTop` smoothly toward the max; holds at the end for `resetPauseMs` then resets to `0` and keeps scrolling (loop); never moves under `prefers-reduced-motion: reduce`; pauses on `pointerenter` and resumes on `pointerleave` (per `research.md` R2, R3, R4)
- [X] T002 Implement the vertical auto-scroll hook in `modules/fly-over-tracker/frontend/src/lib/useAutoScroll.ts` — frame-driven `requestAnimationFrame` loop advancing `scrollTop` by `speedPxPerSecond` (default `25`), `resetPauseMs` (default `2000`) end-pause + snap-to-top loop, `matchMedia('(prefers-reduced-motion: reduce)')` guard with mid-scroll stop, and pointer-enter/leave hover-pause (depends on T001; make T001 green) (per `research.md` R1–R4, `contracts/closest-list-auto-scroll.md`)

**Checkpoint**: Hook unit tests green — user story implementation can now begin in parallel.

---

## Phase 3: User Story 1 - The Closest-Flights List Auto-Scrolls Slowly (Priority: P1) 🎯 MVP

**Goal**: When the closest-flights list overflows the visible area, it glides slowly and smoothly on
its own, pausing at the end and looping (FR-001, FR-002, FR-003, FR-008).

**Independent Test**: Render `FlyOverClosestPanel` with a `maxResults`-large fixture that overflows
its container; with the rAF driver stepped, the list container's `scrollTop` advances slowly toward
the max, holds at the end, then resets to the top. A short/non-overflowing list stays static.

### Tests for User Story 1 (required — Test-First) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T003 [US1] Add FAILING component test in `modules/fly-over-tracker/frontend/src/components/__tests__/FlyOverClosestPanel.test.tsx` — render a long overflowing list (fixture of N aircraft via the mocked `useFlyOversQuery`), stub the rAF globals, and assert the list container's `scrollTop` advances slowly across frames; assert a short non-overflowing list's `scrollTop` stays `0` (FR-001, FR-008)

### Implementation for User Story 1

- [X] T004 [US1] Wire the hook into `modules/fly-over-tracker/frontend/src/components/FlyOverClosestPanel.tsx` — attach `useAutoScroll`'s `ref` to the list container (`div.mt-2.min-h-0.flex-1.space-y-2.overflow-y-auto`) so only the capped list auto-scrolls; the closest-aircraft tile above stays static; empty/loading/error renders are untouched (depends on T002, T003; make T003 green) (FR-001, FR-002, FR-003, FR-008, FR-009)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently (MVP).

---

## Phase 4: User Story 2 - Reduced Motion Is Respected (Priority: P1)

**Goal**: When the user prefers reduced motion, the closest-flights list stays perfectly static and
stops immediately if the preference is toggled mid-scroll (FR-005).

**Independent Test**: Render the panel under a stubbed `matchMedia` with reduced motion enabled and
step many frames — `scrollTop` never changes. Toggling the preference mid-scroll stops advancement.

### Tests for User Story 2 (required — Test-First) ⚠️

- [X] T005 [P] [US2] Add FAILING component test in `modules/fly-over-tracker/frontend/src/components/__tests__/FlyOverClosestPanel.test.tsx` — with `(prefers-reduced-motion: reduce)` stubbed true, the overflowing list never advances across many frames; and switching the preference to true mid-scroll halts advancement (FR-005, `research.md` R4)

### Implementation for User Story 2

- [X] T006 [US2] Confirm/satisfy reduced-motion at the widget level — verify `FlyOverClosestPanel.tsx`'s hook wiring honors the reduced-motion flag end-to-end (the guard lives in the hook from T002; add any passthrough needed so the widget test in T005 goes green) (depends on T004, T005)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently.

---

## Phase 5: User Story 3 - List Content and Interaction Stay Intact (Priority: P2)

**Goal**: Manual scrolling remains fully possible (hover-pause), and the list's content, closest-first
ordering, and refresh behavior are unchanged (FR-006, FR-007, FR-009).

**Independent Test**: Hovering the list pauses the auto-scroll (position held) and leaving resumes it;
the existing panel suite (closest tile, capping, states, status bar, refresh) passes unchanged.

### Tests for User Story 3 (required — Test-First) ⚠️

- [X] T007 [P] [US3] Add FAILING component tests in `modules/fly-over-tracker/frontend/src/components/__tests__/FlyOverClosestPanel.test.tsx` — `pointerEnter` on the list pauses advancement (position held over frames) and `pointerLeave` resumes; empty/loading/error renders never attach a scrolling list (FR-006, FR-009)
- [X] T008 [P] [US3] Confirm no-regression coverage in `modules/fly-over-tracker/frontend/src/components/__tests__/FlyOverClosestPanel.test.tsx` — the existing assertions (closest tile appears once, `maxResults` cap, loading/empty/error states, status bar last-updated, Refresh, prop plumbing) must all pass unchanged after the wiring (FR-007)

### Implementation for User Story 3

- [X] T009 [US3] Ensure the hover-pause and unchanged-content behavior at the widget level — the pause mechanism lives in the hook (T002); confirm the `FlyOverClosestPanel.tsx` wiring exposes it and that no content/ordering/refresh logic changed (make T007 and T008 green) (depends on T004, T007, T008)

**Checkpoint**: All user stories should now be independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories / final validation.

- [X] T010 [P] Add a long-list overflow story to `modules/fly-over-tracker/frontend/src/components/FlyOverClosestPanel.stories.tsx` (many aircraft fixture) so the slow auto-scroll and hover-pause are visually demonstrable (SC-002, `quickstart.md` §2)
- [X] T011 [P] Update behavior notes in `modules/fly-over-tracker/frontend/src/components/FlyOverClosestPanel.mdx` — document the auto-scrolling list (slower than the weather strip), end-pause/loop, hover-pause for manual scroll, and reduced-motion support
- [X] T012 Run the shared quality gates for the workspace: `pnpm lint`, `pnpm format`, `pnpm typecheck`, `pnpm test` — all four must be green, including `modules/fly-over-tracker/frontend`
- [X] T013 Run the `specs/009-closest-flights-auto-scroll/quickstart.md` validation guide end-to-end (hook + component tests, Storybook long-list visual check, reduced-motion check, public-surface check via `build:lib`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Not applicable — the module package already exists (no init tasks).
- **Foundational (Phase 2)**: The hook (T001–T002) BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on the Foundational hook.
  - US1 (T003–T004), US2 (T005–T006), US3 (T007–T009) can proceed sequentially in priority order; they
    touch the same component file, so parallel staffing is NOT recommended (avoid same-file conflicts).
- **Polish (Final Phase)**: Depends on all user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Foundational (hook) only.
- **User Story 2 (P1)**: Depends on Foundational (hook) + US1 wiring (T004). Independently testable.
- **User Story 3 (P2)**: Depends on Foundational (hook) + US1 wiring (T004). Independently testable.

### Within Each User Story

- Tests MUST be written and FAIL before implementation (Constitution IV).
- Hook before component wiring (T002 before T004).
- Core implementation (US1) before integration checks (US2, US3).

### Parallel Opportunities

- T001 is the only Foundational task; T002 follows (sequential red→green).
- T005 and T007/T008 (different test files / different assertions) could run in parallel, but all
  component tests edit `FlyOverClosestPanel.test.tsx` — prefer sequential within one editor to avoid
  merge churn.
- T010, T011, T012, T013 (Polish) are all parallel — different files/commands.

---

## Parallel Example: User Story 1

```bash
# (Sequential red→green is required for tests-first; the hook and wiring are one chain)
Task: "T001 Write FAILING hook unit tests in src/lib/__tests__/useAutoScroll.test.ts"
Task: "T002 Implement the hook in src/lib/useAutoScroll.ts (make T001 green)"
Task: "T003 Write FAILING component wiring test in src/components/__tests__/FlyOverClosestPanel.test.tsx"
Task: "T004 Wire the hook into src/components/FlyOverClosestPanel.tsx (make T003 green)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: the vertical `useAutoScroll` hook (T001–T002).
2. Complete Phase 3: User Story 1 (T003–T004) — the overflowing list auto-scrolls.
3. **STOP and VALIDATE**: `pnpm --filter ./modules/fly-over-tracker/frontend test` — the hook unit
   tests and the US1 wiring test pass; short/non-overflowing lists stay static.
4. Deploy/demo if ready.

### Incremental Delivery

1. Foundational hook → foundation ready.
2. User Story 1 (auto-scroll works) → test independently → MVP.
3. User Story 2 (reduced motion) → test independently.
4. User Story 3 (hover-pause + no regression) → test independently.
5. Polish (story, docs, gates, quickstart).

### Parallel Team Strategy

With multiple developers: the hook (T001–T002) is done by one dev; after it lands, US1, US2, and US3
can be split, but they all edit `FlyOverClosestPanel.tsx` / its test file, so a single implementer
sequentially is the practical path for this small feature.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (Constitution IV — Test-First, NON-NEGOTIABLE)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same-file conflicts, cross-story dependencies that break independence