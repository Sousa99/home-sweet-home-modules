---

description: "Task list template for feature implementation"
---

# Tasks: Next Bus Times (Basic Module Setup)

**Input**: Design documents from `/specs/001-next-bus-times/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Test tasks ARE included — the project constitution (Principle IV,
Test-First, NON-NEGOTIABLE) mandates TDD with dedicated tests for provider
parsing, time/timezone conversion, staleness logic, and query contracts.
Write each test FIRST, confirm it fails, then implement.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Web app: `backend/src/`, `frontend/src/` (see plan.md)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 [P] Add backend dependencies to `backend/package.json` (hono, @hono/node-server, drizzle-orm, better-sqlite3, zod, @modelcontextprotocol/sdk, dotenv) and dev dependency @types/better-sqlite3, then run `pnpm install`
- [ ] T002 [P] Add frontend dependency @tanstack/react-query to `frontend/package.json`, then run `pnpm install`
- [ ] T003 [P] Create `backend/tsconfig.json` extending `tsconfig.base.json`
- [ ] T004 [P] Create `frontend/tsconfig.json` extending `tsconfig.base.json` (jsx react-jsx, DOM libs, types for vite/client)
- [ ] T005 [P] Create `backend/src/config.ts` with runtime defaults (REST port 3000, MCP port 3001, db path `./data/bus-catcher.db`, Carris GTFS feed URL, server name `bus-catcher`)
- [ ] T006 [P] Create `backend/src/lib/logger.ts` for structured logging
- [ ] T007 [P] Create `backend/src/index.ts` dispatching to http (`--http`) or mcp (`--mcp`) from argv
- [ ] T008 [P] Create `frontend/index.html`
- [ ] T009 [P] Create `frontend/src/main.tsx` mounting the app with `QueryClientProvider`
- [ ] T010 [P] Create `frontend/src/App.tsx` with Dashboard/Config tab shell

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests (write first — must FAIL before implementation)

- [ ] T011 [P] Write tests for `backend/src/lib/time.ts` (DST transitions, >24h GTFS minutes, countdown, UTC canonical) in `backend/src/lib/time.test.ts` — expect fail
- [ ] T012 [P] Write tests for GTFS parsing in `backend/src/providers/carris/gtfs.test.ts` using a small fixture feed (stops, routes, trips, stop_times, calendar, calendar_dates; malformed rows skipped with warning) — expect fail
- [ ] T013 [P] Write tests for zod DTO/schema validation in `backend/src/lib/schemas.test.ts` (valid + invalid payloads for Line, Stop, Passing, ConfigStop, Status and query/body schemas) — expect fail
- [ ] T028 [P] Write tests for service-day resolution and the next-times query in `backend/src/providers/carris/queries.test.ts` (weekday + calendar_dates exceptions, line filter, ordering, limit) — expect fail

### Implementation

- [ ] T014 Create `backend/src/db/schema.ts` with drizzle tables (lines, stops, trips, stop_times, calendar, calendar_dates, configured_stops, metadata) per `data-model.md`
- [ ] T015 Create `backend/src/db/client.ts` (better-sqlite3 + drizzle; ensures `./data/` exists)
- [ ] T016 Create `backend/src/db/migrate.ts` (table creation)
- [ ] T017 [P] Create `backend/src/lib/schemas.ts` — zod single source of truth for DTOs and request/query/body schemas (types via `z.infer`)
- [ ] T018 [P] Create `backend/src/lib/time.ts` (GTFS minutes → Europe/Lisbon `Date`, DST-aware, countdown)
- [ ] T019 [P] Create `backend/src/providers/types.ts` with the `ScheduleProvider` interface (the future-ETA seam)
- [ ] T020 [P] Create `backend/src/providers/carris/gtfs.ts` (download feed zip, parse text files into zod-validated rows, skip+log malformed records)
- [ ] T021 Create `backend/src/providers/carris/ingest.ts` (batched upsert into db, update `metadata` feed_version/fetched_at; depends T020)
- [ ] T022 Create `backend/src/providers/carris/queries.ts` (search_stops, list_lines, serving_lines, next_times with service-day + calendar_dates resolution)
- [ ] T023 Create ingest CLI in `backend/src/cli/ingest.ts` wired to `pnpm --filter ./backend ingest`
- [ ] T024 Create `backend/src/http/app.ts` (Hono app; `/api` routes; zod validation; error envelope `{ error, detail? }`)
- [ ] T025 Create `backend/src/http/server.ts` (@hono/node-server bootstrap on :3000)
- [ ] T026 Create `backend/src/mcp/index.ts` (MCP server skeleton + tool registry on :3001/mcp)
- [ ] T027 Finalize `backend/src/index.ts` wiring http and mcp entrypoints

**Checkpoint**: Foundation ready — ingest works (`pnpm --filter ./backend ingest`), REST and MCP servers boot, tests pass. User story implementation can now begin.

---

## Phase 3: User Story 1 - Configure bus stops and lines (Priority: P1) 🎯 MVP

**Goal**: Search Lisbon bus stops, pick stops, optionally restrict each to lines, and save — persisted server-side.

**Independent Test**: Configure a stop via the SPA panel (search → pick → optional line filter → save), reload the page, and confirm the stop and filters are restored.

### Tests for User Story 1 (write FIRST — must FAIL before implementation) ⚠️

- [ ] T029 [P] [US1] Write config service tests in `backend/src/services/config.test.ts` (create/list, unknown stop/line rejected, duplicate rejected) — expect fail

### Implementation for User Story 1

- [ ] T030 [US1] Create `backend/src/services/config.ts` (CRUD over configured_stops; validation against stops/lines tables)
- [ ] T031 [US1] Add REST routes in `backend/src/http/app.ts`: `GET /api/stops?q=`, `GET /api/stops/:id`, `GET /api/lines`, `GET /api/config`, `POST /api/config/stops` (per `contracts/rest-api.md`)
- [ ] T032 [P] [US1] Add MCP tools in `backend/src/mcp/index.ts`: `search_stops`, `get_stop`, `list_lines`, `get_config`, `add_stop` (per `contracts/mcp-tools.md`)
- [ ] T033 [P] [US1] Create `frontend/src/api/client.ts` (typed fetch client for /api)
- [ ] T034 [US1] Create `frontend/src/api/queries.ts` TanStack hooks: `useSearchStops`, `useLines`, `useConfig`, `useAddStop`
- [ ] T035 [P] [US1] Create `frontend/src/components/StopSearch.tsx` (search-as-you-type, pick stop)
- [ ] T036 [P] [US1] Create `frontend/src/components/ConfigPanel.tsx` (line filter per stop, save)
- [ ] T037 [US1] Create `frontend/src/pages/Config.tsx` assembling search + panel

**Checkpoint**: Stop configuration is fully functional and persists across reloads.

---

## Phase 4: User Story 2 - See next scheduled passing times (Priority: P1) 🎯 MVP

**Goal**: Dashboard shows, per configured stop, the next scheduled buses (line, destination, scheduled passing time, countdown) with a freshness indicator.

**Independent Test**: Configure one stop, open the dashboard, and confirm the listed buses and times match the official Carris schedule for today (depends on US1 for the configured stop).

### Tests for User Story 2 (write FIRST — must FAIL before implementation) ⚠️

- [ ] T038 [P] [US2] Write schedule service tests in `backend/src/services/schedule.test.ts` (next-times with/without line filter, order, limit, empty cases) — expect fail

### Implementation for User Story 2

- [ ] T039 [US2] Create `backend/src/services/schedule.ts` (next passing times orchestration over queries)
- [ ] T040 [US2] Add REST routes in `backend/src/http/app.ts`: `GET /api/stops/:id/times?limit=&line=`, `GET /api/status` (per `contracts/rest-api.md`)
- [ ] T041 [P] [US2] Add MCP tools in `backend/src/mcp/index.ts`: `get_stop_times`, `get_status` (per `contracts/mcp-tools.md`)
- [ ] T042 [P] [US2] Extend `frontend/src/api/queries.ts`: `useStopTimes`, `useStatus`
- [ ] T043 [P] [US2] Create `frontend/src/components/StopTimesList.tsx` (line, headsign, scheduled time, countdown)
- [ ] T044 [US2] Create `frontend/src/pages/Dashboard.tsx` (configured stops + times via polling/refetchInterval, freshness indicator)

**Checkpoint**: Dashboard shows next buses and freshness for configured stops; US1 + US2 together are the MVP.

---

## Phase 5: User Story 3 - Manage configured stops (Priority: P2)

**Goal**: Edit/remove configured stops, change line filters, reorder, and enable/disable.

**Independent Test**: Edit a stop's line filter and remove a stop via the panel; confirm the dashboard reflects the change on next load.

### Tests for User Story 3 (write FIRST — must FAIL before implementation) ⚠️

- [ ] T045 [P] [US3] Write update/delete config service tests in `backend/src/services/config.test.ts` (update filter/order/enabled, remove, unknown id) — expect fail

### Implementation for User Story 3

- [ ] T046 [US3] Add REST routes in `backend/src/http/app.ts`: `PUT /api/config/stops/:id`, `DELETE /api/config/stops/:id` (per `contracts/rest-api.md`)
- [ ] T047 [P] [US3] Add MCP tools in `backend/src/mcp/index.ts`: `update_stop`, `remove_stop` (per `contracts/mcp-tools.md`)
- [ ] T048 [US3] Extend `frontend/src/api/queries.ts`: `useUpdateStop`, `useRemoveStop`
- [ ] T049 [US3] Extend `frontend/src/components/ConfigPanel.tsx` (edit filter, reorder, enable/disable, remove)

**Checkpoint**: US1 AND US3 config management both work independently.

---

## Phase 6: User Story 4 - Refresh schedule data (Priority: P3)

**Goal**: Trigger a re-ingest of the schedule; fresh data is used and freshness is reflected.

**Independent Test**: Trigger a refresh, then query next passing times and confirm results reflect the newest available schedule and `lastRefresh`.

### Tests for User Story 4 (write FIRST — must FAIL before implementation) ⚠️

- [ ] T050 [P] [US4] Write refresh service tests in `backend/src/services/refresh.test.ts` (single-flight lock, concurrent requests return in_progress, status updates) — expect fail

### Implementation for User Story 4

- [ ] T051 [US4] Create `backend/src/services/refresh.ts` (single-flight lock, reuses ingest, status via metadata)
- [ ] T052 [US4] Add REST route in `backend/src/http/app.ts`: `POST /api/refresh` (per `contracts/rest-api.md`)
- [ ] T053 [P] [US4] Add MCP tool in `backend/src/mcp/index.ts`: `refresh_schedule` (per `contracts/mcp-tools.md`)
- [ ] T054 [US4] Add SPA refresh trigger + status/`lastRefresh` display in `frontend/src/pages/Dashboard.tsx`

**Checkpoint**: All user stories independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T055 Run `specs/001-next-bus-times/quickstart.md` validation end-to-end (ingest → REST/MCP → SPA → smoke checklist)
- [ ] T056 [P] Update docs (README.md / setup.md) if runtime defaults or scripts changed
- [ ] T057 [P] Run full gates and fix: `pnpm lint`, `pnpm format`, `pnpm test`, `pnpm typecheck`, `node scripts/scaffold.mjs --check`
- [ ] T058 [P] Privacy/log audit: coarse locations only, no PII in logs (constitution: Data & Integration Constraints)
- [ ] T059 [P] Edge-case handling: configured stop/line missing after a refresh is flagged in the dashboard (spec edge cases)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed sequentially in priority order (US1 → US2 → US3 → US4)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - no dependencies on other stories
- **User Story 2 (P1)**: Depends on US1 (dashboard shows configured stops) + Foundational schedule queries
- **User Story 3 (P2)**: Extends US1 config endpoints/tools; independently testable after Foundational
- **User Story 4 (P3)**: Independent of other stories; reuses Foundational ingest

### Within Each User Story

- Tests (mandated by constitution IV) MUST be written and FAIL before implementation
- Models/schemas before services
- Services before endpoints/tools
- Endpoints/tools before frontend integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks (T001–T010) marked [P] can run in parallel
- Foundational tests (T011, T012, T013, T028) run in parallel; models/libs (T017, T018, T019, T020) run in parallel
- US1 and US2 backend tracks (services + REST + MCP) can proceed in parallel once their shared foundational queries exist
- All per-story test tasks and frontend component tasks marked [P] can run in parallel
- Config management (US3) parallel to dashboard work (US2) after Phase 2

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "T029 [P] [US1] config service tests in backend/src/services/config.test.ts"

# Launch frontend building blocks together:
Task: "T033 [P] [US1] Create frontend/src/api/client.ts"
Task: "T035 [P] [US1] Create frontend/src/components/StopSearch.tsx"
Task: "T036 [P] [US1] Create frontend/src/components/ConfigPanel.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 2 — both P1)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (configure stops)
4. Complete Phase 4: User Story 2 (dashboard with next times)
5. **STOP and VALIDATE**: Test US1 + US2 independently (configure → see times)
6. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready (ingest + servers boot)
2. Add User Story 1 → Test independently → Deploy/Demo
3. Add User Story 2 → Test independently → Deploy/Demo (full MVP)
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add User Story 4 → Test independently → Deploy/Demo
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (config)
   - Developer B: User Story 2 backend + dashboard (after queries exist)
   - Developer C: User Story 3 (config management) after US1 backend
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Constitution IV mandates writing tests first and confirming they fail (TDD)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence