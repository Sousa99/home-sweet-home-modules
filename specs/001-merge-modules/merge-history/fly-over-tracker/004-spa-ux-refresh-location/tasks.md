---

description: "Task list for SPA UX Improvements feature implementation"
---

# Tasks: SPA UX Improvements

**Input**: Design documents from `/specs/004-spa-ux-refresh-location/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests ARE included. The feature spec and research.md require them: geolocation paths are tested via a mocked `navigator.geolocation`, auto-refresh via `vi.useFakeTimers()`, and centering/favicon via structural/build assertions. Tests are written before implementation per the module's test culture.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `frontend/src/...` — this feature is frontend-only; backend is untouched.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Shared test tooling for the geolocation feature

- [X] T001 [P] Add a `mockGeolocation` test double in `frontend/src/test/geolocation.ts` (stubs `navigator.geolocation.getCurrentPosition` to trigger success, `PERMISSION_DENIED`, `POSITION_UNAVAILABLE`/`TIMEOUT`, and no-op cases; restores the original in teardown)

## Phase 2: Foundational (Blocking Prerequisites)

> No cross-story blocking prerequisites exist for this feature. US1, US2, and US4 touch disjoint files; US3 shares `App.tsx` with US1 and is sequenced after it. User stories can begin after Phase 1.

---

## Phase 3: User Story 1 - Center the selection panel (Priority: P1) 🎯 MVP

**Goal**: The coordinate form and the List/Map toggle form a single horizontally centered column in both display modes, with no behavioral change.

**Independent Test**: Open the app in list and map modes and verify the selection panel is horizontally centered and all existing interactions behave identically.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T002 [US1] Extend `frontend/src/components/__tests__/App.test.tsx` to assert the centered controls wrapper (structure/classes) in both list and map modes

### Implementation for User Story 1

- [X] T003 [US1] Restructure the controls wrapper in `frontend/src/App.tsx` to a centered flex column (`flex flex-col items-center gap-4`) with the form bounded (`w-full max-w-md`); results area keeps its existing containers

**Checkpoint**: User Story 1 fully functional and testable independently.

---

## Phase 4: User Story 2 - Use my current location (Priority: P1)

**Goal**: A "Use my current location" control above the coordinate inputs fills lat/lng from the browser geolocation API, preserving the radius, without auto-submitting.

**Independent Test**: Grant permission and press the control → lat/lng filled within 1 s, radius unchanged; deny permission → clear alert and unchanged inputs.

### Tests for User Story 2 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T004 [P] [US2] Geolocation tests in `frontend/src/components/__tests__/FlyOverForm.test.tsx` (success fills fields and fires `onChange` with preserved radius; denied/timeout/unavailable show inline alert and leave inputs unchanged; no auto-submit; disabled while `loading`)
- [X] T005 [P] [US2] Update `frontend/src/components/FlyOverForm.stories.tsx` with a mocked-geolocation demo

### Implementation for User Story 2

- [X] T006 [US2] Add the "Use my current location" control (geolocation status handling, radius preservation, inline `role="alert"` errors, unsupported-context message) to `frontend/src/components/FlyOverForm.tsx`, reusing `lib/location.ts` validation and the existing `onChange` path

**Checkpoint**: User Stories 1 AND 2 both work independently.

---

## Phase 5: User Story 3 - Choose an auto-refresh rate (Priority: P2)

**Goal**: A rate selector (off/5/10/30/60 s) re-runs the last submitted query at the chosen
cadence with no overlapping refreshes; manual Refresh remains available. The SPA's data fetch is
refactored to TanStack Query, whose `refetchInterval` drives the cadence, `enabled` gates on a
submitted query, fetch dedup prevents overlap, and `refetch()` backs the manual action. Existing
results stay visible during a background refresh.

**Independent Test**: Submit a query, set 10 s and observe a re-query every ~10 s; set off and
observe none; confirm no overlapping requests.

### Tests for User Story 3 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T007 [P] [US3] Component test for `RefreshRateSelect` in `frontend/src/components/__tests__/RefreshRateSelect.test.tsx` (renders exactly the five options, defaults to off, fires `onChange` on selection, no-op on re-select)
- [X] T008 [US3] `frontend/src/components/__tests__/App.test.tsx`: add a `renderApp` helper wrapping render in a fresh `QueryClientProvider` (`retry: false`) and migrate all existing renders; add auto-refresh tests with `vi.useFakeTimers()` + `advanceTimersByTimeAsync` and synchronous `fireEvent` interactions (10 s cadence re-queries last query; off performs none; rate change resets the interval; no poll during an in-flight fetch; no query before a submit)

### Implementation for User Story 3

- [X] T009 [P] [US3] Create `RefreshRateSelect` in `frontend/src/components/RefreshRateSelect.tsx` (exported `RefreshRate = 'off' | 5 | 10 | 30 | 60`, props `value`/`onChange`)
- [X] T010 [P] [US3] Storybook story in `frontend/src/components/RefreshRateSelect.stories.tsx`
- [X] T011 [US3] Add `@tanstack/react-query` to `frontend/package.json`
- [X] T012 [US3] Mount `QueryClientProvider` in `frontend/src/main.tsx` (`QueryClient` with `retry: false`, `refetchOnWindowFocus: false`)
- [X] T013 [US3] Refactor the fetch layer in `frontend/src/App.tsx` to `useQuery`: `queryKey ['fly-overs', query]`, `enabled: query !== null`, `refetchInterval` from `refreshRate`, `refetch()` for manual refresh; derive `FlyOverStatus` ('idle' pre-submit / 'loading' on first load / 'error' / 'success' with data); form `loading` = first load only; wire `RefreshRateSelect` into the centered panel
- [X] T014 [US3] Export `RefreshRateSelect` and the `RefreshRate`/`RefreshRateSelectProps` types from `frontend/src/components/index.ts` and `frontend/src/index.ts`; assert in `frontend/src/lib/__tests__/exports.test.ts`
- [X] T015 [US3] Amend living docs to the TanStack Query decision: `plan.md` technical context, `research.md` decision #2, `tasks.md` Phase 5 renumbering

**Checkpoint**: User Stories 1–3 all independently functional.

---

## Phase 6: User Story 4 - See a favicon (Priority: P3)

**Goal**: The browser tab and bookmarks show an aircraft favicon (amber plane glyph).

**Independent Test**: Load the page and verify the favicon renders in the tab and bookmark.

### Tests for User Story 4 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T016 [US4] Assert in a Vitest test that `frontend/index.html` contains the `<link rel="icon">` tag and `frontend/public/favicon.svg` exists

### Implementation for User Story 4

- [X] T017 [P] [US4] Create `frontend/public/favicon.svg` (aircraft glyph reusing `PLANE_SVG_PATH` geometry from `frontend/src/lib/aircraftIcon.ts`, filled `#d97706`)
- [X] T018 [US4] Add `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />` to `frontend/index.html`

**Checkpoint**: All user stories independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple stories

- [X] T019 [P] Living documentation: JSDoc for `RefreshRateSelect` and the `FlyOverForm` geolocation control; update README/storybook descriptions as needed
- [X] T020 [P] Verify the library build (`vite.lib.config.ts` + `build:css`) succeeds with the new export, and the SPA build (`dist-app/`) includes `favicon.svg`
- [X] T021 Run quality gates (`pnpm lint`, `pnpm format`, `pnpm test`, `pnpm typecheck`, `node scripts/scaffold.mjs --check`) and execute `quickstart.md` validation scenarios end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately; T001 blocks US2 tests
- **Foundational (Phase 2)**: None required - noted explicitly; stories proceed after Setup
- **User Stories (Phase 3+)**: US1/US2/US4 independent (disjoint files); US3 sequenced after US1 because both edit `App.tsx`
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependency on other stories
- **User Story 2 (P1)**: Depends on T001 (geolocation test double); independent of US1
- **User Story 3 (P2)**: Depends on US1 (shared `App.tsx`); independent of US2/US4
- **User Story 4 (P3)**: No dependency on other stories

### Within Each User Story

- Tests (included) MUST be written and FAIL before implementation
- Tests before components; components before App wiring; exports/stories after implementation
- Story complete before moving to next priority

### Parallel Opportunities

- T001 standalone (Setup)
- US1 and US2 fully parallel (`App.tsx` vs `FlyOverForm.tsx`/test files)
- US3: T007/T009/T010/T011 in parallel; T008 before T013; T012/T013/T014 sequential on the data layer
- US4: T016/T017/T018 in parallel
- Polish T019/T020 in parallel

---

## Parallel Example: User Story 2

```bash
# Launch all tests/demos for User Story 2 together:
Task: "Geolocation tests in frontend/src/components/__tests__/FlyOverForm.test.tsx"
Task: "Update FlyOverForm.stories.tsx with a mocked-geolocation demo"

# then implement:
Task: "Add the current-location control to frontend/src/components/FlyOverForm.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 3: User Story 1 (T002–T003)
3. **STOP and VALIDATE**: Test User Story 1 independently (centered panel)
4. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup → US1 (MVP)
2. Add User Story 2 (current location) → Test independently → Deploy/Demo
3. Add User Story 3 (auto-refresh) → Test independently → Deploy/Demo
4. Add User Story 4 (favicon) → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group; pause for user confirmation between phases per AGENTS.md
- Avoid: same-file conflicts (only `App.tsx` is shared — US1 then US3)