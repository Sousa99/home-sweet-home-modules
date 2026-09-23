---
description: "Task list for feature implementation"
---

# Tasks: Dashboard Embed Components

**Input**: Design documents from `/specs/006-dashboard-components/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests ARE included — the module convention ships a Vitest test per component plus the
library exports regression test, and `quickstart.md` validates the widgets via those tests.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend package**: `frontend/src/`
- Feature docs: `specs/006-dashboard-components/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify the workspace baseline and create the module home for the new shared hook.

- [x] T001 Create `frontend/src/hooks/` directory (home for the shared `useFlyOversQuery` hook); confirm no new dependencies are required for this feature (`pnpm --filter ./frontend ls` shows existing `@tanstack/react-query`, `leaflet`, `react-leaflet` only)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared primitives both P1 widgets need — the `baseUrl`-aware client, the
self-contained query hook, and the updating indicator.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Foundational (write these FIRST, ensure they FAIL before implementation) ⚠️

- [x] T002 [P] Extend client tests in `frontend/src/api/__tests__/client.test.ts`: `getFlyOvers(query)` still requests `/api/fly-overs` (default base) and `getFlyOvers(query, 'https://api.example.com')` requests `https://api.example.com/api/fly-overs`
- [x] T003 [P] Hook tests in `frontend/src/hooks/__tests__/useFlyOversQuery.test.ts`: fetches for the given location + baseUrl (mocked fetch); refetches when `location` changes; refetches on the `autoRefresh` interval (fake timers); exposes `data`/`isLoading`/`isFetching`/`isError`
- [x] T004 [P] Indicator test in `frontend/src/components/__tests__/UpdatingIndicator.test.tsx`: renders "Updating…" spinner with `role="status"` when visible; renders nothing when not updating

### Implementation for Foundational

- [x] T005 [P] Extend `getFlyOvers` in `frontend/src/api/client.ts` with optional `baseUrl?: string` (default `''` → same-origin `/api/fly-overs`; when set → `${baseUrl}/api/fly-overs`), backward compatible, + JSDoc
- [x] T006 [P] Implement `UpdatingIndicator` in `frontend/src/components/UpdatingIndicator.tsx` (small spinner chip labeled "Updating…", `role="status"`, `aria-live="polite"`, absolute top-right positioning handled by the consumer) + JSDoc
- [x] T007 Implement `useFlyOversQuery` in `frontend/src/hooks/useFlyOversQuery.ts` (per-widget `QueryClient` provided by the widgets; `useQuery` with `queryKey ['fly-overs', location, baseUrl]`, `queryFn` → `getFlyOvers(location, baseUrl)`, `refetchInterval` from `autoRefresh`; returns `data, isLoading, isFetching, isError, error, refetch`) + JSDoc (depends T005)

**Checkpoint**: Foundation ready — `pnpm --filter ./frontend typecheck` and `pnpm --filter ./frontend test` pass; user story implementation can now begin

---

## Phase 3: User Story 1 - Embed the map + aircraft list widget (Priority: P1) 🎯 MVP

**Goal**: `FlyOverWidget` — a self-sufficient map + list widget configured via `location` /
`autoRefresh` / `baseUrl`. A read-only map fills the available vertical space and the compact
`AircraftMapCard` list sits beneath at its natural height (scrollable); loading/empty/error
states, top-corner `UpdatingIndicator`, and manual refresh included.

**Independent Test**: Mount `FlyOverWidget` in Storybook or a component test (mocked `fetch`)
with a location + radius — the map container centers on the location, the radius circle and
aircraft markers render, and the compact aircraft cards match the mocked result. Empty and
error states render; auto-refresh and the indicator behave on cadence.

### Tests for User Story 1 (write these FIRST, ensure they FAIL before implementation) ⚠️

- [x] T008 [P] [US1] `AircraftMapView` test in `frontend/src/components/__tests__/AircraftMapView.test.tsx` (react-leaflet mock: map container center matches location, circle radius matches `radiusKm*1000`, one marker per aircraft with `draggable=false`, callsign tooltip content)
- [x] T009 [P] [US1] `FlyOverWidget` test in `frontend/src/components/__tests__/FlyOverWidget.test.tsx` (mocked hook: renders map + `AircraftMapCard` list; empty state when `count:0`; error state on failure; refetches when `location` prop changes; `UpdatingIndicator` visible only while a refresh is in flight; manual refresh triggers a refetch)

### Implementation for User Story 1

- [x] T010 [P] [US1] Implement `AircraftMapView` in `frontend/src/components/AircraftMapView.tsx` (read-only map: `TileLayer` (OSM), `Circle` with radius, center `Marker`, aircraft `Marker`s via `createAircraftIcon(trueTrack)` + callsign `Tooltip`, fit-on-location-change using `circleBounds`/`clampLat`/`map.flyToBounds`; no draggable selection handles) + JSDoc
- [x] T011 [US1] Implement `FlyOverWidget` in `frontend/src/components/FlyOverWidget.tsx` (props per `contracts/components.md`: `location`, `autoRefresh='off'`, `baseUrl=''`, `className`; per-widget `QueryClientProvider`; flex-col `h-full w-full`; map region `flex-1 min-h-0`; list beneath at natural height with scroll cap using `AircraftMapCard`; loading/empty/error states; `UpdatingIndicator` top-right when `isFetching`; manual refresh control) + JSDoc (depends T007, T010)
- [x] T012 [US1] Export `FlyOverWidget` + `FlyOverWidgetProps` from `frontend/src/components/index.ts` and `frontend/src/index.ts`; extend the exports regression test in `frontend/src/lib/__tests__/exports.test.ts` (depends T011)
- [x] T013 [P] [US1] Add Storybook story `frontend/src/components/FlyOverWidget.stories.tsx` (stubbed `fetch`; with-aircraft, empty, and error states; an `autoRefresh` demo) (depends T011)

**Checkpoint**: At this point, User Story 1 is fully functional and testable independently

---

## Phase 4: User Story 2 - Embed the closest-plane card (Priority: P1)

**Goal**: `ClosestAircraftCard` — a compact card showing the single nearest aircraft within the
configured radius using the full `AircraftCard`, with a smooth keyed transition when the closest
aircraft changes, the same props/states, indicator, and manual refresh. Fills width, natural height.

**Independent Test**: Mount with a mocked result — the card shows `aircraft[0]` (distance-sorted,
deterministic `icao24` tie-break). When the mocked result's closest aircraft changes, the card
content is keyed to the new `icao24` and animates in (no abrupt swap). Empty/error states render.

### Tests for User Story 2 (write these FIRST, ensure they FAIL before implementation) ⚠️

- [x] T014 [P] [US2] `ClosestAircraftCard` test in `frontend/src/components/__tests__/ClosestAircraftCard.test.tsx` (mocked hook: renders `aircraft[0]` via `AircraftCard`; deterministic tie-break by `icao24`; empty state when `count:0`; error state on failure; when the closest `icao24` changes the content is keyed to the new aircraft with the transition animation class; `UpdatingIndicator` visible only while a refresh is in flight)

### Implementation for User Story 2

- [x] T015 [P] [US2] Add closest-change transition keyframes (fade + slight vertical slide, ~250 ms) to `frontend/src/index.css` (`--animate-closest-card-in` + `@keyframes closest-card-in`; applied via a keyed wrapper)
- [x] T016 [US2] Implement `ClosestAircraftCard` in `frontend/src/components/ClosestAircraftCard.tsx` (props per `contracts/components.md`; per-widget `QueryClientProvider`; closest = min `distanceKm` with deterministic `icao24` tie-break; render `AircraftCard` inside a wrapper `key={icao24}` with the transition animation; loading/empty/error states; `UpdatingIndicator` top-right when `isFetching`; manual refresh; `w-full`, natural height) + JSDoc (depends T007, T015)
- [x] T017 [US2] Export `ClosestAircraftCard` + `ClosestAircraftCardProps` from `frontend/src/components/index.ts` and `frontend/src/index.ts`; extend the exports regression test in `frontend/src/lib/__tests__/exports.test.ts` (depends T016)
- [x] T018 [P] [US2] Add Storybook story `frontend/src/components/ClosestAircraftCard.stories.tsx` (stubbed `fetch`; closest-change demo via timed stub swap; empty/error states) (depends T016)

**Checkpoint**: At this point, User Stories 1 AND 2 both work independently

---

## Phase 5: User Story 3 - Live updates with feedback (Priority: P2)

**Goal**: The auto-refresh cadence, top-corner update feedback, and no-flicker transitions are
verified as a cohesive live-update experience across both widgets, with any gaps closed.

**Independent Test**: With `autoRefresh` set on either widget (fake timers + mocked `fetch`), the
widget refetches on the configured cadence and the `UpdatingIndicator` shows only while a fetch is
in flight, clearing on completion; a manual refresh behaves the same; rapid consecutive
closest-aircraft changes produce one clean keyed transition without stale-content flash.

### Tests for User Story 3 (write these FIRST, ensure they FAIL before implementation) ⚠️

- [x] T019 [P] [US3] Cross-widget live-update tests in `frontend/src/components/__tests__/live-updates.test.tsx` (real hook + mocked `getFlyOvers`: cadence refetch on the `autoRefresh` interval for both widgets; no poll while a fetch is in flight; indicator visible during a manual refresh and clears on completion)
- [x] T020 [P] [US3] No-flicker test in `frontend/src/components/__tests__/live-updates.test.tsx` (alternating mocked results: each closest-aircraft change produces a single keyed transition with no stale-content flash)

### Implementation for User Story 3

- [x] T021 [US3] Verify and close gaps in the live-update wiring: `autoRefresh` interval honored via `useFlyOversQuery`, manual refresh exposed by both widgets, indicator wired to `isFetching` only; document the react-query self-containment (per-widget `QueryClientProvider` + isolated cache) in the `useFlyOversQuery` and widget JSDoc (depends T019, T020)
- [x] T022 [US3] Update Storybook coverage: ensure `FlyOverWidget.stories.tsx` and `ClosestAircraftCard.stories.tsx` exercise the `autoRefresh` prop; verify `pnpm --filter ./frontend build-storybook` succeeds

**Checkpoint**: All user stories are now independently functional; the live-update experience is verified end-to-end

---

## Phase 6: Publish Surface & Storybook Docs

**Purpose**: Publish only the two dashboard widgets and give them a dedicated Storybook section with MDX documentation (props tables + live examples).

- [x] T023 [US1] Rewrite the library entry `frontend/src/index.ts` to export only `FlyOverWidget`, `ClosestAircraftCard`, their prop types, and the shared types their props reference (`LocationQuery`, `Center`, `Aircraft`, `FlyOverResult`, `RefreshRate`); update the header JSDoc
- [x] T024 [US1] Update the exports regression test `frontend/src/lib/__tests__/exports.test.ts` to assert the two widgets are exported and the SPA components / API client are not
- [x] T025 [P] Retitle the widget stories into a dedicated Storybook section: `title: 'DashboardWidgets/FlyOverWidget'` and `'DashboardWidgets/ClosestAircraftCard'`
- [x] T026 [P] Add `frontend/src/components/FlyOverWidget.mdx` (Meta/Canvas/Controls/ArgTypes doc page)
- [x] T027 [P] Add `frontend/src/components/ClosestAircraftCard.mdx` (Meta/Canvas/Controls/ArgTypes doc page)
- [x] T028 [P] Add `frontend/src/components/DashboardWidgets.mdx` overview page (install, import, peer deps, self-sufficient fetch, canvases)
- [x] T029 Add `'../src/**/*.mdx'` to the Storybook `stories` glob in `frontend/.storybook/main.ts`
- [x] T030 Sync `specs/006-dashboard-components/{plan.md,research.md,contracts/components.md}` to the widgets-only publish surface
- [x] T031 Verify `pnpm --filter ./frontend build:lib` produces a widgets-only bundle and `pnpm --filter ./frontend build-storybook` renders the MDX pages

**Checkpoint**: The package publishes only the two widgets; Storybook shows a separate `DashboardWidgets` section with props-documented MDX pages

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T032 [P] Update `specs/006-dashboard-components/quickstart.md` outcomes to match the implemented behavior (widget states, closest transition, indicator, auto-refresh cadence, `baseUrl`, `DashboardWidgets` section + MDX docs, widgets-only publish surface) and keep it runnable
- [x] T033 Run `quickstart.md` end-to-end: `pnpm --filter ./frontend build:lib` produces the widgets-only bundle; `pnpm --filter ./frontend build-storybook` renders the `DashboardWidgets` section; live-backend validation (`FEED=mock` backend + `curl /api/fly-overs` incl. 400 validation)
- [x] T034 [P] Final JSDoc/comment pass across `frontend/src/api/client.ts`, `frontend/src/hooks/useFlyOversQuery.ts`, and `frontend/src/components/{AircraftMapView,FlyOverWidget,ClosestAircraftCard,UpdatingIndicator}.tsx` (no stale shared-cache wording; README left as-is — scaffold-generated, feature docs live in specs/006 + Storybook MDX + JSDoc)
- [x] T035 Run all quality gates and fix failures: `pnpm lint`, `pnpm format`, `pnpm test`, `pnpm typecheck`, `node scripts/scaffold.mjs --check` (resolved `index.css` drift via `index.css.tpl`; prettier-formatted the `.mdx` files)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational completion
  - US1 and US2 are both P1 and can proceed in parallel (different files)
  - US3 consolidates/validates the live-update behaviors and depends on both widgets
- **Publish Surface & Storybook Docs (Phase 6)**: Depends on US1 + US2 (documents the widgets)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - no dependency on US2
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - no dependency on US1
- **User Story 3 (P2)**: Depends on US1 + US2 (cross-widget live-update validation)

### Within Each User Story

- Tests (included) MUST be written and FAIL before implementation
- Shared hook/client before components; map view before widget composition; component before exports/story
- Story complete before moving to next priority

### Parallel Opportunities

- Foundational tests T002–T004 can run in parallel; implementations T005/T006 in parallel; T007 after T005
- US1: tests T008/T009 in parallel; T010 and T011 sequential (T011 needs the map view); T012/T013 after T011
- US2: T014/T015 in parallel; T016 after T015; T017/T018 after T016
- US1 and US2 are fully parallel after Foundational (different files, no cross-dependencies)
- Publish Surface: T023 → T024; T025–T028 parallel (stories/MDX); T029 then T031 (build verification)
- Polish tasks T032/T034 in parallel; T033 and T035 depend on implementation completion

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "AircraftMapView test in frontend/src/components/__tests__/AircraftMapView.test.tsx"
Task: "FlyOverWidget test in frontend/src/components/__tests__/FlyOverWidget.test.tsx"

# After Foundational, launch the map + widget in sequence, then exports + story in parallel:
Task: "Implement AircraftMapView in frontend/src/components/AircraftMapView.tsx"
Task: "Implement FlyOverWidget in frontend/src/components/FlyOverWidget.tsx"
Task: "Export FlyOverWidget + extend exports.test.ts"
Task: "Add FlyOverWidget.stories.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (map + list widget)
4. **STOP and VALIDATE**: `FlyOverWidget` renders map + list against mocked/live data; states behave
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (map + list widget) → Test independently → Deploy/Demo (first MVP)
3. Add User Story 2 (closest-plane card, P1) → Test independently → Deploy/Demo
4. Add User Story 3 (live-update feedback, P2) → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (FlyOverWidget)
   - Developer B: User Story 2 (ClosestAircraftCard)
3. Then Developer C (or A+B): User Story 3 cross-widget validation
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group (per AGENTS.md multi-phase rule, pause after each phase commit for user confirmation)
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence