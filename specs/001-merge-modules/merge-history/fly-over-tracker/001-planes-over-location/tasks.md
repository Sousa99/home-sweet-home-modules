---

description: "Task list for feature implementation"
---

# Tasks: Planes Over a Location (MVP)

**Input**: Design documents from `/specs/001-planes-over-location/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: The examples below include test tasks. Tests ARE included — explicitly requested by the user (unit tests + JSDoc throughout).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- Feature docs: `specs/001-planes-over-location/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Add backend runtime deps to `backend/package.json`: `hono`, `@hono/node-server`, `zod`, `@hono/zod-validator`, `@modelcontextprotocol/server`, `@modelcontextprotocol/hono`, `pino`, `pino-http` (+ dev dep `pino-pretty`); pin one zod v4 instance workspace-wide (run `pnpm dedupe`; verify `pnpm ls zod` shows exactly one instance)
- [x] T002 [P] Create backend source directory layout: `backend/src/lib/`, `backend/src/domain/`, `backend/src/feeds/`, `backend/src/services/`, `backend/src/http/`, `backend/src/mcp/`, `backend/src/tests/unit/`, `backend/src/tests/contract/`, `backend/http/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Implement runtime config in `backend/src/lib/config.ts` (ports 3000/3001, maxRadiusKm 500, feed URL + timeouts, LOG_LEVEL, FEED=mock|opensky) with env overrides + JSDoc
- [x] T004 Implement logger in `backend/src/lib/logger.ts` (pino: JSON prod / pino-pretty dev transport / silent in tests) + JSDoc
- [x] T005 Implement error types in `backend/src/lib/errors.ts` (AppError hierarchy + mapper to 400/502/503 HTTP responses) + JSDoc
- [x] T006 Define shared zod v4 schemas in `backend/src/domain/schemas.ts` (LocationQuerySchema, AircraftSchema, FlyOverResultSchema) + JSDoc
- [x] T007 Define `z.infer` domain types in `backend/src/domain/types.ts`
- [x] T008 [P] Unit tests for config/logger/errors in `backend/src/tests/unit/lib.test.ts`
- [x] T009 [P] Unit tests for schemas in `backend/src/tests/unit/schemas.test.ts`

**Checkpoint**: Foundation ready — `pnpm --filter ./backend typecheck` and `pnpm --filter ./backend test` pass; user story implementation can now begin

---

## Phase 3: User Story 1 - Answer "What's flying over here?" (Priority: P1) 🎯 MVP

**Goal**: Backend answers "aircraft currently over a GPS point + radius" identically through REST (`GET /api/fly-overs`) and MCP (`planes_over` tool), backed by one shared service, no caching/persistence.

**Independent Test**: Run the backend with `FEED=mock` (`pnpm --filter ./backend dev`), then `GET /api/fly-overs` for the mock fixture location returns the expected aircraft with all fields; an MCP `tools/call planes_over` for the same input returns the identical `FlyOverResult` JSON (parity per `contracts/rest-fly-overs.md` and `contracts/mcp-planes-over.md`).

### Tests for User Story 1 (write these FIRST, ensure they FAIL before implementation) ⚠️

- [x] T010 [P] [US1] Geometry unit tests in `backend/src/tests/unit/geometry.test.ts` (bbox-from-circle math, haversine distances, equator/antimeridian/edge points)
- [x] T011 [P] [US1] Feed unit tests in `backend/src/tests/unit/feeds.test.ts` (OpenSky state-vector mapping incl. null fields; mock feed fixture)
- [x] T012 [P] [US1] Service unit tests in `backend/src/tests/unit/flyOverService.test.ts` (validation, distance filter, empty result with `asOf`, feed-error propagation)
- [x] T013 [P] [US1] REST contract tests in `backend/src/tests/contract/rest-fly-overs.test.ts` via `hono/testing` `testClient` (200 shape, 400 field errors, 502/503 feed error)
- [x] T014 [P] [US1] MCP tool + parity tests in `backend/src/tests/contract/mcp-planes-over.test.ts` (in-process MCP Client vs `handler.fetch`; asserts REST and MCP return identical payloads)

### Implementation for User Story 1

- [x] T015 [P] [US1] Implement geometry helpers in `backend/src/geometry.ts` (`bboxFromCircle`, `haversineKm`) + JSDoc
- [x] T016 [P] [US1] Define `AircraftFeed` interface in `backend/src/feeds/types.ts`
- [x] T017 [P] [US1] Implement OpenSky feed client in `backend/src/feeds/opensky.ts` (bbox + `extended=1`, anonymous, `429`/5xx/timeout → typed errors, no caching) + JSDoc
- [x] T018 [P] [US1] Implement deterministic mock feed in `backend/src/feeds/mock.ts` (aircraft fixture near a known location) + JSDoc
- [x] T019 [US1] Implement `FlyOverService` in `backend/src/services/flyOverService.ts` (inject feed; validate → query → haversine filter → map to `FlyOverResult`; `asOf` from feed time; shared by REST + MCP) + JSDoc (depends on T003–T018)
- [x] T020 [P] [US1] Build REST app in `backend/src/http/app.ts` (Hono, request logging, `onError`/`notFound` using shared error mapper)
- [x] T021 [US1] Implement `GET /api/fly-overs` in `backend/src/http/routes.ts` (`zValidator('query', LocationQuerySchema)`, typed handler → `FlyOverResult`; 400/502/503 per `contracts/rest-fly-overs.md`) (depends on T019, T020)
- [x] T022 [P] [US1] Build MCP server in `backend/src/mcp/server.ts` (`createMcpHonoApp` + `createMcpHandler` factory; `planes_over` tool with shared `LocationQuerySchema` → `FlyOverResult` JSON; per `contracts/mcp-planes-over.md`)
- [x] T023 [US1] Implement entry dispatch in `backend/src/index.ts` (`--http` → port 3000, `--mcp` → port 3001, `FEED=mock` select, startup logging, graceful shutdown) (depends on T021, T022)
- [x] T024 [P] [US1] Add REST request collection in `backend/http/fly-overs.http` (happy path, invalid input 400, empty area, feed-error example)

**Checkpoint**: At this point, User Story 1 is fully functional and testable independently — REST and MCP parity verified, quickstart.md §1–3 runnable

---

## Phase 4: User Story 2 - Find fly-overs from the web app (Priority: P2)

**Goal**: SPA where the user types GPS coordinates + radius and sees the current aircraft over that area, with a manual Refresh button; look/feel for the final product using the HSH theme and ui primitives.

**Independent Test**: Run backend + frontend (`pnpm --filter ./frontend dev`), submit coordinates for the mock fixture location, the SPA lists the aircraft; click Refresh and the list re-queries; invalid input shows an inline error without firing a request.

### Tests for User Story 2 (write these FIRST, ensure they FAIL before implementation) ⚠️

- [x] T025 [P] [US2] Frontend tests with mocked `fetch` in `frontend/src/components/__tests__/` (FlyOverForm validation/submit, FlyOverList loading/empty/error states, api/client request+response mapping, App integration)

### Implementation for User Story 2

- [x] T026 [P] [US2] Create SPA HTML entry in `frontend/index.html` (title per `docs/clarify.md`, `#root`, loads `src/main.tsx`)
- [x] T027 [P] [US2] Create React entry `frontend/src/main.tsx` and app shell `frontend/src/App.tsx` (header + layout with HSH theme)
- [x] T028 [P] [US2] Implement API client in `frontend/src/api/client.ts` (`getFlyOvers({ lat, lng, radiusKm })`, typed `FlyOverResult`, error mapping) + JSDoc
- [x] T029 [P] [US2] Implement `FlyOverForm` in `frontend/src/components/FlyOverForm.tsx` (Label/Input for lat, lng, radiusKm; submit → onQuery; disabled while loading) + JSDoc
- [x] T030 [P] [US2] Implement `FlyOverList` in `frontend/src/components/FlyOverList.tsx` (loading/empty/error states, `asOf` timestamp, manual Refresh via onRefresh) + JSDoc
- [x] T031 [P] [US2] Implement `AircraftCard` in `frontend/src/components/AircraftCard.tsx` (callsign, origin, altitude, velocity, heading, distance; Card/Badge) + JSDoc
- [x] T032 [US2] Compose `App.tsx`: FlyOverForm + FlyOverList + client wiring; manual Refresh re-queries the current location (depends on T026–T031)

**Checkpoint**: At this point, User Stories 1 AND 2 both work independently — SPA functional on :5173 with `/api` proxy

---

## Phase 5: User Story 3 - Reuse the fly-over experience as components (Priority: P3)

**Goal**: Expose the fly-over components through the publishable library entry and demo them in Storybook; `build:lib` succeeds.

**Independent Test**: `pnpm --filter ./frontend build:lib` succeeds and `src/index.ts` exports the components; `pnpm --filter ./frontend storybook` renders FlyOverForm, FlyOverList, AircraftCard against sample data.

### Tests for User Story 3 (write these FIRST, ensure they FAIL before implementation) ⚠️

- [x] T033 [P] [US3] Library export test asserting `frontend/src/index.ts` re-exports FlyOverForm, FlyOverList, AircraftCard

### Implementation for User Story 3

- [x] T034 [P] [US3] Create library entry `frontend/src/index.ts` (re-export FlyOverForm, FlyOverList, AircraftCard + ui primitives)
- [x] T035 [P] [US3] Create component barrel `frontend/src/components/index.ts`
- [x] T036 [P] [US3] Add Storybook stories in `frontend/src/components/FlyOverForm.stories.tsx`, `FlyOverList.stories.tsx`, `AircraftCard.stories.tsx` (sample data)

**Checkpoint**: At this point, User Story 3 works independently — components build, publish, and render in Storybook

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T037 [P] Fix `Dockerfile.backend` (remove `node dist/migrate.js &&` from CMD and the `COPY backend/drizzle` step — no DB in MVP)
- [x] T038 [P] Verify `docs/clarify.md` runtime-default confirmations match the implementation (ports 3000/3001, MCP server name `fly-over-tracker`, SPA title, `/api` proxy target); re-run `node scripts/scaffold.mjs --check` after any generated-file touch
- [x] T039 Run `quickstart.md` end-to-end (backend REST via `backend/http/fly-overs.http`, MCP `tools/list`, SPA flow, mock + live feed) and fix any gaps
- [x] T040 [P] Final JSDoc/comment pass across `backend/src` and `frontend/src`; update README with a feature note (living documentation)
- [x] T041 Run all quality gates and fix failures: `pnpm lint`, `pnpm format`, `pnpm test`, `pnpm typecheck`, `node scripts/scaffold.mjs --check`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Needs US1's REST API running to demo, but is independently testable with mocked `fetch`
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Uses US2's components but is independently testable (build + Storybook)

### Within Each User Story

- Tests (included) MUST be written and FAIL before implementation
- Domain/geometry before feed, feed before service, service before endpoints
- REST endpoint before MCP entry dispatch; both before `index.ts`
- Story complete before moving to next priority

### Parallel Opportunities

- T002, T008, T009 (Phase 2) can run in parallel after T001
- All US1 test tasks T010–T014 can run in parallel
- All US1 model/feed tasks T015–T018 can run in parallel
- T020/T022 can run in parallel (REST app vs MCP server); T021 depends on T020; T023 depends on T021/T022
- US2 and US3 implementation tasks are mostly parallelizable (different files)

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Geometry unit tests in backend/src/tests/unit/geometry.test.ts"
Task: "Feed unit tests in backend/src/tests/unit/feeds.test.ts"
Task: "Service unit tests in backend/src/tests/unit/flyOverService.test.ts"
Task: "REST contract tests in backend/src/tests/contract/rest-fly-overs.test.ts"
Task: "MCP tool + parity tests in backend/src/tests/contract/mcp-planes-over.test.ts"

# Launch all feed/geometry tasks together:
Task: "Implement geometry helpers in backend/src/geometry.ts"
Task: "Define AircraftFeed interface in backend/src/feeds/types.ts"
Task: "Implement OpenSky feed client in backend/src/feeds/opensky.ts"
Task: "Implement mock feed in backend/src/feeds/mock.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: REST + MCP parity test, quickstart §1–3
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2 (with mocked fetch)
   - Developer C: User Story 3 (after US2 components exist)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group (per AGENTS.md multi-phase rule, pause after each phase commit)
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence