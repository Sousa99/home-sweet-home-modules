---

description: "Task list for Center Map on Selection Submit feature implementation"
---

# Tasks: Center Map on Selection Submit

**Input**: Design documents from `/specs/005-map-center-on-submit/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests ARE included. The plan.md and the module's test culture require them: the
`circleBounds` geometry is unit-tested in `location.test.ts`, the fit behavior is asserted through
the extended react-leaflet mock in `FlyOverMap.test.tsx`, and the mode-dependent fit scenarios are
covered in `App.test.tsx`. Tests are written before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `frontend/src/...` — this feature is frontend-only; backend is untouched.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Shared test tooling for the map-fit feature

- [ ] T001 [P] Extend `frontend/src/test/react-leaflet-mock.tsx` with a `useMap` hook returning a fake map instance recorded in a `mapStore` (records each `flyToBounds` call with its bounds argument and options, plus `getSize`/`getCenter`); add a `resetMapStore()` helper; mirror the existing `markerStore` pattern so tests can assert fit calls deterministically

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The pure geometry and its tests that BOTH user stories depend on

> **⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T002 [P] Add `circleBounds(center: LatLng, radiusKm: number): { southwest: LatLng; northeast: LatLng }` to `frontend/src/lib/location.ts`, built from the four cardinal extents via the existing `destPoint` helper (north 0°, east 90°, south 180°, west 270°): `southwest = { lat: south.lat, lng: west.lng }`, `northeast = { lat: north.lat, lng: east.lng }`
- [ ] T003 [P] Unit tests for `circleBounds` in `frontend/src/lib/__tests__/location.test.ts` (small / typical / maximum radius; `center` is the box midpoint; for bearings 0/45/90/135/180/225/270/315 the destination point at `radiusKm` lies within the returned box; known-value case at the equator)

**Checkpoint**: Foundation ready — user story implementation can now begin in parallel.

---

## Phase 3: User Story 1 - Fit on submit in map mode (Priority: P1) 🎯 MVP

**Goal**: After the user presses "Find aircraft" in map mode, the map animates so the submitted center is centered in the frame and the selection circle fills roughly 90% of it (full circle visible with a small margin). Draft edits, marker drags, pan/zoom, and refreshes never move the view.

**Independent Test**: Submit a selection in map mode and verify the map centers on it with the circle filling most of the frame; then edit inputs / drag markers / pan / zoom and verify the view does not jump.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T004 [P] [US1] Component tests in `frontend/src/components/__tests__/FlyOverMap.test.tsx`: no `flyToBounds` call before a `fitRequest` is provided; exactly one call on mount when `fitRequest` is present; a new call when `fitRequest` changes; no call when only `center`/`radiusKm` change or when `fitRequest` is unchanged; the fitted bounds enclose the circle (SW/NE corners) and `maxZoom: 19` is passed
- [X] T005 [P] [US1] Add a `FitOnSubmit` story to `frontend/src/components/FlyOverMap.stories.tsx` that passes a `fitRequest` along with aircraft

### Implementation for User Story 1

- [X] T006 [P] [US1] Add an optional `fitRequest?: LocationQuery | null` prop to `frontend/src/components/FlyOverMap.tsx` with an internal `MapFitController` child inside `MapContainer` that uses `useMap()` and, via a ref comparing the previous request, calls `map.flyToBounds` with the padded SW/NE corner array from `circleBounds` (corners inflated by 3%) and `{ maxZoom: 19 }`; fit on mount when `fitRequest` is present and on `fitRequest` change; never fit on `center`/`radiusKm` change
- [X] T007 [US1] Wire `fitRequest={query}` to `<FlyOverMap>` in `frontend/src/App.tsx` (the last submitted `LocationQuery`; unchanged for draft edits, pan/zoom, and refresh)
- [X] T008 [US1] Update the `FlyOverMap` contract in `specs/005-map-center-on-submit/contracts/fly-over-map.md` to the shipped props (including `fitRequest?: LocationQuery | null`)

**Checkpoint**: User Story 1 fully functional and testable independently.

---

## Phase 4: User Story 2 - Pending fit from list mode (Priority: P2)

**Goal**: When a selection is submitted while the map is not visible (list mode), the map applies the fit to that selection on first mount after switching to map mode; switching modes again without a new submit does not refit.

**Independent Test**: Submit a selection in list mode, switch to map mode and verify the fit applies; switch back to list and to map again without a new submit and verify no refit occurs.

### Tests for User Story 2 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T009 [P] [US2] App-level tests in `frontend/src/components/__tests__/App.test.tsx`: submitting in map mode passes `fitRequest` and triggers one fit; submitting in list mode then switching to map mode triggers a fit on mount; switching list↔map without a new submit does not trigger an additional fit

### Implementation for User Story 2

- [X] T010 [US2] Lift the “already fitted” state to `App` so a map remount does not refit: add `fittedQuery` state and `pendingFit` derivation in `frontend/src/App.tsx`, pass `fitRequest={pendingFit ? query : null}`, and have the controller report applied fits via a new optional `onFitApplied` prop in `frontend/src/components/FlyOverMap.tsx`; sync the `fly-over-map` contract and research/plan docs

**Checkpoint**: User Stories 1 AND 2 both work independently.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect both user stories

- [X] T011 [P] Living documentation: JSDoc for `circleBounds` in `frontend/src/lib/location.ts` and the `fitRequest`/`MapFitController` in `frontend/src/components/FlyOverMap.tsx`; sync `plan.md` and `research.md` with the shipped behavior as needed
- [X] T012 Run quality gates (`pnpm lint`, `pnpm format`, `pnpm test`, `pnpm typecheck`, `node scripts/scaffold.mjs --check`) and execute the `quickstart.md` validation scenarios end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately; T001 blocks US1 tests
- **Foundational (Phase 2)**: Depends on Setup completion; T002/T003 BLOCK both user stories
- **User Stories (Phase 3+)**: US1 depends on Phase 1+2; US2 depends on US1 (shared `App.tsx` and the fit mechanism in `FlyOverMap.tsx`)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on T001 (mock `useMap`), T002/T003 (`circleBounds`) — no dependency on US2
- **User Story 2 (P2)**: Depends on US1 (the `fitRequest` mechanism); independently testable once US1 lands

### Within Each User Story

- Tests (included) MUST be written and FAIL before implementation
- Tests before components; components before App wiring; contract/docs after implementation
- Story complete before moving to next priority

### Parallel Opportunities

- Phase 1+2: T001, T002, T003 all parallel
- US1: T004/T005 in parallel; T006 before T007; T008 parallel with T006
- US2: T009 after US1 implementation; T010 after T009
- Polish: T011/T012 in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all tests/demos for User Story 1 together:
Task: "Component tests in frontend/src/components/__tests__/FlyOverMap.test.tsx"
Task: "Add a FitOnSubmit story to frontend/src/components/FlyOverMap.stories.tsx"

# then implement (T006 first, T007 wires it, T008 documents it):
Task: "Add fitRequest prop + MapFitController to frontend/src/components/FlyOverMap.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002, T003)
3. Complete Phase 3: User Story 1 (T004–T008)
4. **STOP and VALIDATE**: Test User Story 1 independently (fit on submit in map mode)
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2 (after US1's `FlyOverMap` mechanism lands)
3. Stories integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group; pause for user confirmation between phases per AGENTS.md
- Avoid: same-file conflicts (only `App.tsx` and `FlyOverMap.tsx` are shared — US1 then US2)