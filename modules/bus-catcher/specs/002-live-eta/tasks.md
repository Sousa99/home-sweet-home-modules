---

description: "Task list template for feature implementation"
---

# Tasks: Live ETA

**Input**: Design documents from `/specs/002-live-eta/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Test tasks ARE included — the project constitution (Principle IV,
Test-First, NON-NEGOTIABLE) mandates TDD with dedicated tests for provider
parsing, staleness/demotion logic, merge/delay math, query contracts, and the
frontend Live/Schedule UI. Write each test FIRST, confirm it fails, then
implement.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Web app: `backend/src/`, `frontend/src/` (see plan.md)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Runtime configuration for the realtime source (no new
dependencies — the stack from 001 is reused; `fetch` is built into Node 24).

- [x] T001 Add realtime config defaults to `backend/src/config.ts` (`realtimeUrl` default `https://api.carrismetropolitana.pt/v2`, `realtimeTtlMs` default 30000, `realtimeStaleAfterMs` default 90000) with env overrides `CM_REALTIME_URL`, `REALTIME_TTL_MS`, `REALTIME_STALE_AFTER_MS` (see `research.md` §7)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Realtime provider, TTL cache, and schema evolution that MUST be
complete before ANY user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests (write first — must FAIL before implementation)

- [x] T002 [P] Write tests for CM arrivals parsing in `backend/src/providers/carris-metropolitana/realtime.test.ts` (fixture JSON for `GET /arrivals/by_stop/:id`: estimated/scheduled/observed present; `estimated_arrival_unix` null ⇒ `estimatedAt` null; malformed rows skipped with warning) — expect fail
- [x] T003 [P] Write tests for the realtime TTL cache + per-stop single-flight in `backend/src/providers/carris-metropolitana/cache.test.ts` (expiry, concurrent fetch returns one in-flight promise) — expect fail
- [x] T004 [P] Write tests for staleness + merge + delay logic in `backend/src/services/schedule.test.ts` (fresh prediction ⇒ `source: "live"` with `predictedAt`/`delayMinutes`; stale prediction demoted; `estimatedAt` null ⇒ scheduled; realtime-only trip skipped; sort by shown time) — expect fail
- [x] T005 [P] Write zod schema tests in `backend/src/lib/schemas.test.ts` (valid live/scheduled `Passing` rows; new `RealtimeInfo`/`Status` realtime fields; **001 payloads still parse unchanged** — backward compatibility) — expect fail

### Implementation

- [x] T006 Extend `backend/src/lib/schemas.ts`: `Passing` gains optional `source`/`predictedAt`/`delayMinutes`; add `RealtimeInfo` (`available`, `lastUpdate`, `liveCount`, `totalCount`) and `Status` realtime fields (`realtimeLastUpdate`, `realtimeAvailable`, `realtimeStale`); add `StopTimesResponse` (`stopId`, `times`, `realtime`) per `contracts/rest-api.md`
- [x] T007 [P] Add `LiveEtaProvider` interface (`getStopArrivals(stopId): Promise<LivePrediction[]>` + freshness) to `backend/src/providers/types.ts` behind the 001 seam (constitution III)
- [x] T008 [P] Create `backend/src/providers/carris-metropolitana/realtime.ts` — fetch `GET {realtimeUrl}/arrivals/by_stop/:id`, zod-parse into `LivePrediction[]`; **fetch/parse failure returns a degraded result, never throws** (failure isolation)
- [x] T009 [P] Create `backend/src/providers/carris-metropolitana/cache.ts` — in-memory TTL cache keyed by `stopId` (TTL `realtimeTtlMs`) with per-stop single-flight
- [x] T010 Wire the `LiveEtaProvider` implementation into `backend/src/providers/carris-metropolitana/index.ts`; record `realtime_last_fetch` in `metadata` on success (constitution II/V)

**Checkpoint**: Foundation ready — the realtime provider is fetchable, cached, and tested. User story implementation can now begin.

---

## Phase 3: User Story 1 - See live predicted arrival times (Priority: P1) 🎯 MVP

**Goal**: Each bus row shows a live predicted time (marked **Live**, with a
delay delta) when a fresh CM prediction exists, else the scheduled time
marked **Schedule** — the difference is visible per row.

**Independent Test**: With the feed reachable and a stop in operation, open
the dashboard and confirm each listed bus shows either a "Live" row
(predicted time + delta) or a "Schedule" row — never an unlabelled time.

### Tests for User Story 1 (write FIRST — must FAIL before implementation) ⚠️

- [x] T011 [P] [US1] Write schedule service merge tests in `backend/src/services/schedule.test.ts` (`getStopTimes` returns `{ times, realtime }`; live rows carry `source`/`predictedAt`/`delayMinutes`) — expect fail
- [x] T012 [P] [US1] Write REST route test in `backend/src/http/app.test.ts` (`GET /api/stops/:id/times` returns `{ stopId, times, realtime }` with enriched rows) — expect fail
- [x] T013 [P] [US1] Write component tests in `frontend/src/components/StopTimesList.test.tsx` (live row shows predicted time + "Live" badge + delta; scheduled row shows `scheduledAt` + "Schedule" marker) — expect fail

### Implementation for User Story 1

- [x] T014 [US1] Extend `backend/src/services/schedule.ts` — merge `LivePrediction[]` onto scheduled passings (`source`/`predictedAt`/`delayMinutes`; stale/null predictions demoted; unmatched trips skipped with a warning log) and compute the `RealtimeInfo` block per `data-model.md` §3
- [x] T015 [US1] Update `GET /api/stops/:id/times` in `backend/src/http/app.ts` to return `{ stopId, times, realtime }` (per `contracts/rest-api.md`)
- [x] T016 [P] [US1] Update MCP `get_stop_times` in `backend/src/mcp/index.ts` to the enriched payload (per `contracts/mcp-tools.md`)
- [x] T017 [P] [US1] Extend `frontend/src/api/types.ts` — `Passing` `source`/`predictedAt`/`delayMinutes`, `RealtimeInfo`, `StopTimesResponse`
- [x] T018 [P] [US1] Add `formatDelay` to `frontend/src/lib/time.ts` (`"+4 min"`, `"-2 min"`, `"on time"`)
- [x] T019 [US1] Update `frontend/src/components/StopTimesList.tsx` — per-row Live/Schedule marker, predicted time shown when live, delay delta (depends on T017, T018)

**Checkpoint**: User Story 1 fully functional — live vs scheduled is visible per row and testable independently.

---

## Phase 4: User Story 2 - Know when live times are unavailable (Priority: P1)

**Goal**: A stop with no realtime coverage — or a feed that is down or stale —
shows a per-stop notice that times are schedule-only, and the dashboard never
errors.

**Independent Test**: With the realtime feed unreachable (or a stop without
coverage), open the dashboard and confirm the stop shows a "Live times
unavailable — showing schedule" notice with all rows marked Schedule and no
error.

### Tests for User Story 2 (write FIRST — must FAIL before implementation) ⚠️

- [x] T020 [P] [US2] Write component tests in `frontend/src/components/StopCoverage.test.tsx` (available vs unavailable notice text; feed-down state renders schedule-only notice) — expect fail
- [x] T021 [P] [US2] Write route test in `backend/src/http/app.test.ts` (realtime provider degraded ⇒ `200` with all rows `source: "scheduled"` and `realtime.available === false`; no 5xx) — expect fail

### Implementation for User Story 2

- [x] T022 [US2] Create `frontend/src/components/StopCoverage.tsx` — per-stop notice driven by `realtime.available` (uses `times.data?.realtime` from `useStopTimes`)
- [x] T023 [US2] Integrate `StopCoverage` into each StopCard in `frontend/src/pages/Dashboard.tsx`; keep scheduled rows rendering when `available === false`

**Checkpoint**: User Stories 1 AND 2 both work independently — the schedule-only state is clearly signalled per stop.

---

## Phase 5: User Story 3 - See how live times differ from the schedule (Priority: P2)

**Goal**: Delay deltas are meaningful — users can see "on time", "early"
(`-2 min`), or "late" (`+4 min`) at a glance for every live bus.

**Independent Test**: Find a live bus running late and confirm its row shows
the deviation next to the live time; confirm on-time rows say "on time"
without a misleading delta.

### Tests for User Story 3 (write FIRST — must FAIL before implementation) ⚠️

- [x] T024 [P] [US3] Write delay classification tests in `frontend/src/lib/time.test.ts` (`formatDelay`: +4 ⇒ `"+4 min"`, −2 ⇒ `"-2 min"`, 0 ⇒ `"on time"`; rounding; null `delayMinutes`) — expect fail

### Implementation for User Story 3

- [x] T025 [P] [US3] Harden `formatDelay` classification in `frontend/src/lib/time.ts` (on-time/early/late semantics, rounding, null-safe)
- [x] T026 [US3] Wire the classification into `frontend/src/components/StopTimesList.tsx` delta display (refine T019 output; ensure on-time rows show no misleading delta)

**Checkpoint**: User Stories 1, 2, AND 3 independently functional.

---

## Phase 6: User Story 4 - Live freshness and coverage (Priority: P3)

**Goal**: The dashboard shows when the realtime feed was last updated, how
many of a stop's listed buses are live, and a global banner when the feed is
down or stale.

**Independent Test**: Open a stop with partial coverage and confirm the
coverage line ("2 of 5 live · updated Xs ago") and the feed freshness match
reality; simulate a feed outage and confirm the global banner appears.

### Tests for User Story 4 (write FIRST — must FAIL before implementation) ⚠️

- [x] T027 [P] [US4] Write status route test in `backend/src/http/app.test.ts` (`GET /api/status` returns `realtimeLastUpdate`/`realtimeAvailable`/`realtimeStale` from `realtime_last_fetch` metadata) — expect fail
- [x] T028 [P] [US4] Write coverage display tests in `frontend/src/components/StopCoverage.test.tsx` (`liveCount`/`totalCount` text + last-update age label) — expect fail

### Implementation for User Story 4

- [x] T029 [US4] Extend `GET /api/status` in `backend/src/http/app.ts` and MCP `get_status` in `backend/src/mcp/index.ts` to return the realtime fields (from `realtime_last_fetch` + staleness budget)
- [x] T030 [P] [US4] Extend `frontend/src/api/types.ts`/`frontend/src/api/queries.ts` for `Status` realtime fields
- [x] T031 [US4] Extend `frontend/src/components/StopCoverage.tsx` with the coverage detail line (`liveCount`/`totalCount`, last-update age)
- [x] T032 [US4] Add a global realtime status banner to `frontend/src/pages/Dashboard.tsx` (feed down/stale; reuse the `useStatus` hook)

**Checkpoint**: All user stories independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T033 Run `specs/002-live-eta/quickstart.md` validation end-to-end (realtime REST/MCP → SPA → smoke checklist)
- [x] T034 [P] Update docs (`README.md` / `setup.md`) if realtime runtime defaults or env vars changed
- [x] T035 [P] Run full gates and fix: `pnpm lint`, `pnpm format`, `pnpm test`, `pnpm typecheck`, `node scripts/scaffold.mjs --check`
- [x] T036 [P] Observability audit: realtime fetch/cache/degradation decisions logged via structured logging; no PII (constitution V)
- [x] T037 [P] Edge-case handling: realtime-only trips skipped with a warning; feed flap transitions live↔scheduled between refreshes without error (spec edge cases)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed sequentially in priority order (US1 → US2 → US3 → US4)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - no dependencies on other stories
- **User Story 2 (P1)**: Depends on US1 (consumes the `realtime` block in the times response); independently testable after US1
- **User Story 3 (P2)**: Depends on US1 (refines the US1 delay delta); otherwise independent
- **User Story 4 (P3)**: Depends on US2 (extends `StopCoverage`) + US1 (realtime block); status fields are independent of other stories

### Within Each User Story

- Tests (mandated by constitution IV) MUST be written and FAIL before implementation
- Schemas/interfaces before providers
- Providers/cache before services
- Services before endpoints/tools
- Endpoints/tools before frontend integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Foundational tests (T002–T005) and providers (T007–T009) run in parallel
- US1 backend (T014–T016) and frontend foundation (T017–T018) can proceed in parallel after T006/T008/T009
- All per-story test tasks and frontend component tasks marked [P] can run in parallel
- US3 delay classification (T024–T025) is parallel to US2 work once US1 lands
- US4 status backend (T029) is independent of the coverage UI (T031)

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "T011 [P] [US1] schedule merge tests in backend/src/services/schedule.test.ts"
Task: "T012 [P] [US1] REST route test in backend/src/http/app.test.ts"
Task: "T013 [P] [US1] StopTimesList component tests in frontend/src/components/StopTimesList.test.tsx"

# Launch frontend building blocks together:
Task: "T017 [P] [US1] Extend frontend/src/api/types.ts"
Task: "T018 [P] [US1] Add formatDelay to frontend/src/lib/time.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 — P1)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (live predictions with Live/Schedule markers)
4. **STOP and VALIDATE**: Test US1 independently (open dashboard → live vs scheduled rows)
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → realtime provider ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP: live ETAs visible)
3. Add User Story 2 → Test independently → Deploy/Demo (schedule-only state signalled)
4. Add User Story 3 → Test independently → Deploy/Demo (delay semantics)
5. Add User Story 4 → Test independently → Deploy/Demo (freshness + coverage)
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (merge + endpoints + row UI)
   - Developer B: User Story 3 (delay classification) — parallel to US1 frontend
   - Developer C: User Story 4 status backend (T029)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Constitution IV mandates writing tests first and confirming they fail (TDD)
- Backward compatibility (001 SC-005 / spec FR-008): `Passing`/`Status` changes are optional fields; existing dashboard consumers keep working
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence