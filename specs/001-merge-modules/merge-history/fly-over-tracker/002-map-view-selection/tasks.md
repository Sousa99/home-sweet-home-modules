---

description: "Task list for Map View & Selection feature implementation"
---

# Tasks: Map View & Selection

**Input**: Design documents from `/specs/002-map-view-selection/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests ARE included. The feature specification and research.md (Decision 5) require them: component tests mock `react-leaflet` for jsdom, `lib/location.ts` geometry is unit-tested, and App tests drive the full sync flow. Tests are written before implementation per the module's test culture.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `frontend/src/...` — this feature is frontend-only; backend is untouched.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the map dependencies and prepare the test/bundle environment

- [X] T001 Add `leaflet` and `react-leaflet@5` to dependencies and `@types/leaflet` to devDependencies in `frontend/package.json`
- [X] T002 [P] Add a global `react-leaflet`/`leaflet` mock for jsdom test runs in `frontend/src/test/setup.ts` (mock `MapContainer`, `TileLayer`, `Circle`, `Marker`, and the event callbacks)
- [X] T003 [P] Import `leaflet/dist/leaflet.css` and configure Leaflet default marker icon URLs (bundle-safe paths) for the SPA entry in `frontend/src/main.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Pure location geometry that MUST be complete before US2 (map selection) and is reused by US1 (clamped map rendering)

**⚠️ CRITICAL**: No user story work depending on geometry can begin until this phase is complete

- [X] T004 Create pure location helpers in `frontend/src/lib/location.ts` (clampLat/clampLng, inRange checks vs MAX_RADIUS_KM, haversineKm, radiusFromCenterAndEdge, locationQueryFromCenterRadius)
- [X] T005 [P] Unit tests for location helpers in `frontend/src/lib/__tests__/location.test.ts` (boundary cases, poles, antimeridian clamp)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View fly-overs as a list or on a map (Priority: P1) 🎯 MVP

**Goal**: Add a single-action toggle switching the fly-over result display between the list and an interactive map, both showing the same query result without re-querying.

**Independent Test**: Submit a query for a location with air traffic, switch between list and map, and verify both display the identical aircraft set and that switching preserves the query and results.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T006 [P] [US1] Component test for `ViewModeToggle` in `frontend/src/components/__tests__/ViewModeToggle.test.tsx` (options render, active option highlighted, no-op on re-select)
- [X] T007 [P] [US1] Extend `frontend/src/components/__tests__/App.test.tsx` (switch list→map shows same result, map→list preserves results, no extra query on toggle)

### Implementation for User Story 1

- [X] T008 [P] [US1] Create `ViewModeToggle` component in `frontend/src/components/ViewModeToggle.tsx` (`mode: 'list' | 'map'`, `onChange`)
- [X] T009 [P] [US1] Create render-only `FlyOverMap` in `frontend/src/components/FlyOverMap.tsx` (MapContainer, TileLayer, radius Circle, center Marker, read-only aircraft Markers; no selection handlers yet)
- [X] T010 [US1] Wire view mode state, the toggle, and the wider map layout into `frontend/src/App.tsx` (render list or map from the same result; preserve query)
- [X] T011 [US1] Export `ViewModeToggle` and `FlyOverMap` (plus prop types) from `frontend/src/components/index.ts`
- [X] T012 [P] [US1] Storybook stories in `frontend/src/components/ViewModeToggle.stories.tsx` and `frontend/src/components/FlyOverMap.stories.tsx`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Select a location from the map (Priority: P1)

**Goal**: Make the map a full location-selection input: draggable center marker (lat/lng) and draggable edge marker (radius via haversine), bidirectionally synced with the Lat/Lng/Radius inputs; query still runs on explicit "Find aircraft" submit.

**Independent Test**: Select a center and radius on the map and verify the input fields update; type coordinates and a radius and verify the map marker and circle move to match; submit and verify the query uses exactly the selected location.

### Tests for User Story 2 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T013 [P] [US2] `FlyOverMap` selection tests in `frontend/src/components/__tests__/FlyOverMap.test.tsx` (center drag → onCenterChange; edge drag → onRadiusChange; aircraft markers read-only; pan/zoom do not call callbacks)
- [X] T014 [P] [US2] `FlyOverForm` controlled tests in `frontend/src/components/__tests__/FlyOverForm.test.tsx` (external `value` updates inputs; editing a valid field calls `onChange`; invalid input still blocked on submit)
- [X] T015 [US2] Extend `frontend/src/components/__tests__/App.test.tsx` (map selection updates inputs; input edits reposition map; submit uses the shared draft; typed vs map parity)

### Implementation for User Story 2

- [X] T016 [P] [US2] Make `FlyOverForm` controlled in `frontend/src/components/FlyOverForm.tsx` (add `value`/`onChange`; keep existing `onSubmit`/`loading`; backward-compatible when `value` is omitted)
- [X] T017 [P] [US2] Add draggable center + edge markers and radius recompute to `frontend/src/components/FlyOverMap.tsx` (`onCenterChange`/`onRadiusChange`, clamped via `lib/location.ts`)
- [X] T018 [US2] Wire the shared `LocationDraft` into `frontend/src/App.tsx` (single draft state; pass `value`/`onChange` to the form and `center`/`radiusKm`/callbacks to the map; submit runs `getFlyOvers(draft)`)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Pan and zoom without changing the selection (Priority: P2)

**Goal**: Verify and lock in that panning/zooming the map never changes the selected location, the input values, or the displayed result, and never triggers a query.

**Independent Test**: Select a location, pan and zoom extensively, and verify the selected location, input values, and any displayed results remain unchanged.

### Tests for User Story 3 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T019 [US3] Pan/zoom invariance tests in `frontend/src/components/__tests__/FlyOverMap.test.tsx` (map move/zoom events do not move markers, change circle, or fire onCenterChange/onRadiusChange)

### Implementation for User Story 3

- [X] T020 [US3] Ensure only the two markers are draggable and no move/zoom handler mutates the selection in `frontend/src/components/FlyOverMap.tsx` (rely on Leaflet defaults; add guard if needed)

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T021 [P] Add map-load failure fallback (clear message + list/typed input remains usable) in `frontend/src/App.tsx`
- [X] T022 [P] Verify the library build (`vite.lib.config.ts` + `build:css`) still produces and bundles the Leaflet CSS
- [X] T023 [P] Living documentation: JSDoc for new components/helpers and update README/storybook descriptions as needed
- [X] T024 Run quality gates (`pnpm lint`, `pnpm format`, `pnpm test`, `pnpm typecheck`, `node scripts/scaffold.mjs --check`) and execute `quickstart.md` validation scenarios end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS US2 geometry work
- **User Stories (Phase 3+)**: 
  - US1 depends on Phase 1/2 setup (map CSS/mock present)
  - US2 depends on Phase 2 (geometry helpers) and is independent of US1
  - US3 depends on US2 (markers must exist to verify invariance)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Setup/Foundational - no dependency on other stories
- **User Story 2 (P1)**: Can start after Foundational - independent of US1, but shares `App.tsx` and `FlyOverMap.tsx` files with US1 (sequence to avoid conflicts)
- **User Story 3 (P2)**: Builds on US2 - verify selection invariance after markers exist

### Within Each User Story

- Tests (included) MUST be written and FAIL before implementation
- Geometry/helpers before components
- Components before App wiring
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- Setup T002/T003 in parallel
- Foundational T004/T005 in parallel
- US1: T006/T007/T008/T009/T012 in parallel
- US2: T013/T014 and T016/T017 in parallel
- Polish T021-T023 in parallel
- US1 and US2 touch disjoint files except `App.tsx` and `FlyOverMap.tsx` - sequence those to avoid same-file conflicts

---

## Parallel Example: User Story 2

```bash
# Launch all tests for User Story 2 together:
Task: "FlyOverMap selection tests in frontend/src/components/__tests__/FlyOverMap.test.tsx"
Task: "FlyOverForm controlled tests in frontend/src/components/__tests__/FlyOverForm.test.tsx"

# Launch the two component implementations together:
Task: "Make FlyOverForm controlled in frontend/src/components/FlyOverForm.tsx"
Task: "Add draggable markers + radius recompute in frontend/src/components/FlyOverMap.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently (mode switch with render-only map)
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group; pause for user confirmation between phases per AGENTS.md
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence