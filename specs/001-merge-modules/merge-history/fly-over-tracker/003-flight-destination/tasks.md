# Tasks: Flight Destination Enrichment

**Input**: Design documents from `/specs/003-flight-destination/`

**Prerequisites**: plan.md (required), spec.md (user stories), research.md, data-model.md, contracts/

**Tests**: Included per plan.md Testing section + module quality gates (`pnpm test` must pass).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- Tests live in `backend/src/tests/` per the existing Vitest layout (unit/ and contract/).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm a green baseline before any change (existing repo — no project init).

- [X] T001 [P] Confirm baseline quality gates pass (`pnpm lint && pnpm format && pnpm test && pnpm typecheck && node scripts/scaffold.mjs --check`) before making changes

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared infrastructure every story depends on — config, feed abstraction, retry, auth, cache, airports, schema.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 Add OpenSky/destination/retry env vars with defaults (`OPENSKY_CLIENT_ID`, `OPENSKY_CLIENT_SECRET`, `OPENSKY_TOKEN_URL`, `RETRY_ATTEMPTS`, `RETRY_DEFAULT_MS`, `RETRY_CAP_MS`, `DEST_WINDOW_H`=24, `DEST_CONCURRENCY`=8, `DEST_CACHE_TTL_MS`, `DEST_NEGATIVE_TTL_MS`) to `Config` + `loadConfig` in backend/src/lib/config.ts
- [X] T003 [P] Add `DestinationInfo` type + `FlightRouteFeed` interface to backend/src/feeds/types.ts
- [X] T004 [P] Implement `fetchWithRetry` in backend/src/lib/retry.ts (429 → `X-Rate-Limit-Retry-After-Seconds` or default → bounded retry; optional 401 refresh+retry hook; `FeedUnavailableError({retryable:true})` on exhaustion)
- [X] T005 [P] Implement `OAuth2TokenManager` in backend/src/feeds/openskyAuth.ts (client-credentials exchange, 30-min expiry with refresh margin, refresh on 401)
- [X] T006 [P] Implement in-memory destination cache in backend/src/lib/destinationCache.ts (positive TTL 10 min, negative TTL 60 s)
- [X] T007 [P] Add ICAO→country static map loaded once in backend/src/lib/airports.ts
- [X] T008 Add `destinationEnrichment` z.enum (`'complete'|'partial'|'unavailable'`) to `FlyOverResultSchema` and re-infer `FlyOverResult` in backend/src/domain/schemas.ts + backend/src/domain/types.ts
- [X] T009 [P] Unit tests for retry helper, token manager, cache, and airports map in backend/src/tests/unit/ (additions to lib.test.ts, feeds.test.ts)

**Checkpoint**: Foundation ready — user story implementation can begin.

---

## Phase 3: User Story 1 - Destination for Every Matching Flight (Priority: P1) 🎯 MVP

**Goal**: Every aircraft in a fly-over result carries the estimated destination airport (ICAO) and country, resolved live from OpenSky `/flights/aircraft` with OAuth2 auth, caching, and bounded concurrency; the result reports `destinationEnrichment`.

**Independent Test**: Query a location with air traffic via REST and MCP and verify each returned aircraft has `destinationAirport`/`destinationCountry` populated where the source identifies them, with identical values across both interfaces.

### Tests for User Story 1 (write FIRST, ensure FAIL before implementation)

- [X] T010 [P] [US1] Update REST contract test expectations (populated destinations + `destinationEnrichment`) in backend/src/tests/contract/rest-fly-overs.test.ts
- [X] T011 [P] [US1] Update MCP parity test expectations in backend/src/tests/contract/mcp-planes-over.test.ts
- [X] T012 [P] [US1] Unit tests for flight-route mapping + 24h window clamped to the current UTC day in backend/src/tests/unit/flightRoutes.test.ts

### Implementation for User Story 1

- [X] T013 [P] [US1] Implement `OpenSkyFlightRouteFeed` in backend/src/feeds/flightRoutes.ts (`GET /flights/aircraft?icao24&begin&end`, `estArrivalAirport`, pick flight covering "now", retry via lib/retry, auth via token manager)
- [X] T014 [P] [US1] Add fixture destinations to backend/src/feeds/mock.ts and create `MockRouteFeed` in backend/src/feeds/mockRoutes.ts
- [X] T015 [US1] Enrich matched aircraft in backend/src/services/flyOverService.ts (accept `FlightRouteFeed`, bounded concurrency, destination cache, `destinationEnrichment`: complete/partial/unavailable)
- [X] T016 [US1] Wire `OpenSkyFlightRouteFeed` (or `MockRouteFeed` when `FEED=mock`) + token manager + config in backend/src/index.ts
- [X] T017 [P] [US1] Mirror `destinationEnrichment` field on `FlyOverResult` in frontend/src/api/types.ts
- [X] T018 [US1] Service enrichment tests (complete/partial/unavailable + cache reuse) in backend/src/tests/unit/flyOverService.test.ts

**Checkpoint**: User Story 1 fully functional and independently testable.

---

## Phase 4: User Story 2 - Queries Recover When the Data Source Is Rate-Limited (Priority: P2)

**Goal**: The states feed retries bounded attempts on 429 honoring retry-after (or a default), and refreshes the token once on 401, before surfacing the existing 503.

**Independent Test**: Mocked 429 with retry-after → waits, retries, returns data; persistent 429 → bounded attempts then 503; 401 → token refresh + single retry.

### Tests for User Story 2 (write FIRST, ensure FAIL before implementation)

- [X] T019 [P] [US2] Unit tests for states-feed 429 retry/backoff + 401 token refresh in backend/src/tests/unit/feeds.test.ts
- [X] T020 [P] [US2] REST contract test for 503 only after bounded retries in backend/src/tests/contract/rest-fly-overs.test.ts

### Implementation for User Story 2

- [X] T021 [US2] Apply `fetchWithRetry` + auth Bearer header (when configured) to `OpenSkyFeed.getSnapshot` in backend/src/feeds/opensky.ts

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Feasibility Evaluation for Flight Path Lines (Priority: P3)

**Goal**: The written go/no-go evaluation (delivered in the plan phase, research.md Decision 8) is verified against FR-011 acceptance scenarios and referenced as the decision record.

**Independent Test**: A reviewer reads the evaluation and confirms it covers data source, per-query credit cost, latency, frontend fit, and an explicit recommendation.

- [X] T022 [US3] Verify research.md Decision 8 satisfies FR-011 acceptance scenarios (data source, cost, latency, frontend fit, go/no-go) and confirm the "on-demand per-selected-aircraft tracks only" recommendation
- [X] T023 [US3] Add a "see research.md Decision 8" pointer to Story 3 of specs/003-flight-destination/spec.md

**Checkpoint**: All user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple stories; final quality gates.

- [X] T024 [P] Add destination + `destinationEnrichment` examples to the REST collection in backend/http/fly-overs.http
- [X] T025 [P] Run `pnpm lint && pnpm format && pnpm typecheck` and fix issues across changed files
- [X] T026 [P] Run `pnpm test` — full suite (unit + contract + parity) green
- [X] T027 [P] Run `node scripts/scaffold.mjs --check` (no generated-file drift)
- [X] T028 Run quickstart.md validation scenarios (`FEED=mock` destinations; live-with-credentials; no-credentials → `destinationEnrichment: "unavailable"`)
- [X] T029 [P] Load `.env` via `import 'dotenv/config'` in backend/src/index.ts (package-dir `.env` for dev; existing env always wins)
- [X] T030 [P] Add backend/.env.example documenting all supported variables (placeholders only)
- [X] T031 Add hand-written docs/configuration.md — env reference, OpenSky credential acquisition steps, local `.env`/Docker/GitHub-secrets usage
- [X] T032 Update specs/003-flight-destination/quickstart.md to reference docs/configuration.md for credential setup

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup; BLOCKS all user stories.
- **User Stories (Phase 3+)**: Depend on Foundational; proceed in priority order P1 → P2 → P3.
- **Polish (Phase 6)**: Depends on desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: After Foundational — no dependencies on other stories. **MVP.**
- **User Story 2 (P2)**: After Foundational — reuses `lib/retry.ts` from Foundational; independent of US1 (does not touch flightRoutes/service).
- **User Story 3 (P3)**: After Foundational — documentation only.

### Within Each User Story

- Tests (included) MUST be written and FAIL before implementation.
- Contracts/tests → feed/mock → service → wiring → integration.
- Story complete before moving to next priority.

### Parallel Opportunities

- Phase 1: single verification task.
- Phase 2: T003–T007, T009 marked [P] run in parallel; T002 and T008 sequential (different files but shared config domain).
- US1: T010–T014, T017 parallel; T015/T016/T018 sequential after the [P] group.
- US2: T019–T020 parallel; T021 after.
- Different stories can be worked in parallel by different team members once Foundational completes.

---

## Parallel Example: User Story 1

```bash
# Tests + independent units together:
Task: "Update REST contract test in backend/src/tests/contract/rest-fly-overs.test.ts"
Task: "Update MCP parity test in backend/src/tests/contract/mcp-planes-over.test.ts"
Task: "Unit tests for flight-routes mapping in backend/src/tests/unit/flightRoutes.test.ts"
Task: "Implement OpenSkyFlightRouteFeed in backend/src/feeds/flightRoutes.ts"
Task: "Mock destinations in backend/src/feeds/mock.ts + MockRouteFeed in backend/src/feeds/mockRoutes.ts"
Task: "Mirror destinationEnrichment in frontend/src/api/types.ts"
# Then sequential:
Task: "Enrich aircraft in backend/src/services/flyOverService.ts"
Task: "Wire feeds in backend/src/index.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: destination enrichment end-to-end (mock + live), REST/MCP parity
5. Deploy/demo if ready

### Incremental Delivery

1. Foundation ready → US1 (destination enrichment, MVP) → test independently → deploy
2. US2 (429 backoff) → test independently → deploy
3. US3 (feasibility doc) → already delivered in research.md; verify and reference

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3 (documentation)
3. Stories complete and integrate independently; Polish runs last

---

## Notes

- [P] tasks = different files, no dependencies
- No new dependencies added (plain `fetch` for OAuth2 + retry)
- Tests follow module convention (Vitest; `backend/src/tests/unit`, `backend/src/tests/contract`)
- Commit after each task or logical group; stop at each checkpoint to validate
- Avoid: vague tasks, same-file conflicts (opensky.ts is touched only by US2; flightRoutes/service only by US1)