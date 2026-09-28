---

description: "Task list for Local Setup & Module Standardization (004)"

---

# Tasks: Local Setup & Module Standardization

**Input**: Design documents from `/specs/004-local-setup-standardization/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: No unit-test tasks are generated: the in-scope changes are Compose/n YAML, Dockerfile, and
nginx-template artifacts, validated end-to-end through the `quickstart.md` runtime scenarios (which
the phases reference). The one source-code area of the standard (SPA `API_BASE_URL` env +
component `baseUrl` prop) is explicitly deferred per clarification Q2:C and tracked in the gap
assessment — it is NOT implemented in this feature.

**Organization**: Tasks are grouped by user story so each story can be implemented, tested, and
delivered independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5, US6)
- Include exact file paths in descriptions
- Paths are relative to the repository root unless stated otherwise

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Repository-level scaffolding for the compose environment

- [x] T001 Create root `docker-compose.yml` skeleton: the shared network, the five profiles
  (`mcp`, `rest+spa`, `rest+storybook`, `full`, `backend`), and per-module service stubs
  (`<slug>-backend`, `<slug>-mcp`, `<slug>-spa`, `<slug>-storybook`) named per
  `specs/004-local-setup-standardization/contracts/compose.md`
- [x] T002 Create root `.env.example` documenting the overridable surface: host-port overrides and
  per-module `BACKEND_UPSTREAM` (per `specs/004-local-setup-standardization/contracts/compose.md`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The minimal, explicitly-accepted conformance fixes every compose mode needs —
per-module env-templated nginx `/api` reverse proxy (FR-005/FR-006 wiring) and a Storybook image
(no module builds one today). **No user-story mode can be fully validated until this phase is done.**

> These are build/config artifacts, so their "tests" are the `quickstart.md` runtime scenarios,
> executed in the US1 phase.

- [x] T003 [P] Add an env-templated `/api` reverse proxy plus an `envsubst` nginx entrypoint to the
  bus-catcher SPA image: convert `modules/bus-catcher/deploy/nginx.spa.conf` to a
  `nginx.spa.conf.template` where `BACKEND_UPSTREAM` (empty ⇒ no proxy, same-origin) sets the
  `proxy_pass` target, and update `modules/bus-catcher/Dockerfile.frontend` to run `envsubst` on it
  at container start
- [x] T004 [P] Same env-templated `/api` proxy + `envsubst` entrypoint for the fly-over-tracker SPA
  image (`modules/fly-over-tracker/deploy/nginx.spa.conf`, `modules/fly-over-tracker/Dockerfile.frontend`)
- [x] T005 [P] Same env-templated `/api` proxy + `envsubst` entrypoint for the procrastinator-tracker
  SPA image (`modules/procrastinator-tracker/deploy/nginx.spa.conf`,
  `modules/procrastinator-tracker/Dockerfile.frontend`)
- [x] T006 [P] Create `modules/bus-catcher/Dockerfile.storybook`: build
  `pnpm --filter @sousa99/bus-catcher-components build-storybook`, serve `dist-storybook` with the
  same env-templated nginx (`/api` proxy) used by the SPA image
- [x] T007 [P] Create `modules/fly-over-tracker/Dockerfile.storybook` (same pattern, filter
  `@sousa99/fly-over-tracker-components`)
- [x] T008 [P] Create `modules/procrastinator-tracker/Dockerfile.storybook` (same pattern, filter
  `@sousa99/procrastinator-tracker-components`)
- [x] T009 [P] Create `modules/current-time/Dockerfile.storybook` (same pattern, filter
  `@sousa99/current-time-components`)

**Checkpoint**: Foundation ready — `docker compose build` produces backend, mcp (same image),
SPA, and Storybook images for every module. User-story work can begin.

---

## Phase 3: User Story 1 - One-Command Local Environment (Priority: P1) 🎯 MVP

**Goal**: Launch all modules (or one chosen module) from a single command in any of the five run
modes, with fixed collision-free ports, backend→SPA connectivity, data persistence, and no rebuild
on mode switches (FR-001 to FR-007).

**Independent Test**: Run the single launch command for all five modes and for a single module;
confirm every expected service starts and is reachable at its documented address
(`specs/004-local-setup-standardization/contracts/ports.md`) with no port collisions and no per-module
configuration. This is the MVP and is fully verifiable in one session.

### Implementation for User Story 1

- [x] T010 [US1] Fill `docker-compose.yml` service definitions: build contexts (per
  `contracts/compose.md`), backend vs mcp commands (`node dist/index.js --http` /
  `--mcp`), per-module env (`PORT`/`HTTP_PORT`, `MCP_PORT`, `DB_PATH`/`DATABASE_URL`), and host-port
  mappings exactly as in `specs/004-local-setup-standardization/contracts/ports.md`
- [x] T011 [US1] Add per-service healthchecks and `depends_on: condition: service_healthy`
  ordering in `docker-compose.yml`: bus-catcher `GET /api/health`, procrastinator-tracker
  `GET /health`, fly-over-tracker TCP probe on the REST port (research Decision 7)
- [x] T012 [US1] Add the common data-directory bind mount (`./data:/data`) to the DB-backed
  bus-catcher and procrastinator-tracker backend/mcp services in `docker-compose.yml` (FR-018)
- [x] T013 [US1] Set `BACKEND_UPSTREAM=<slug>-backend:3000` on every spa and storybook service in
  `docker-compose.yml` (the "SPA through env" connection wiring, FR-005/FR-006)
- [x] T014 [US1] Validate MCP-only mode via `specs/004-local-setup-standardization/quickstart.md`
  scenario 1: MCP streamable-HTTP handshake succeeds on host ports 3200/3201/3202
- [x] T015 [US1] Validate REST+SPA mode via `quickstart.md` scenario 2: each SPA loads and reaches
  its own module's backend (bus-catcher 3300→3100, fly-over-tracker 3301→3101,
  procrastinator-tracker 3302→3102, current-time 3303 dashboard)
- [x] T016 [US1] Validate REST+Storybook mode via `quickstart.md` scenario 3: each workbench
  (3400–3403) renders and data-fetching stories query their backend with no CORS errors
- [x] T017 [US1] Validate full and backend-only modes plus single-module scope via
  `quickstart.md` scenarios 4 and 5
- [x] T018 [US1] Validate no port collisions, no-rebuild mode switching, and data persistence via
  `quickstart.md` scenarios 6, 7, and 8
- [x] T019 [US1] Document the single launch command: update root `AGENTS.md` (Common commands) and
  root `README.md` with the five compose modes, the ports reference link
  (`specs/004-local-setup-standardization/contracts/ports.md`), and the common `data/` directory
  (FR-001, SC-001)

**Checkpoint**: At this point User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Configurable Backend Connection (Priority: P1)

**Goal**: Prove the SPA's backend location is configurable through an environment variable at the
compose layer, with a same-origin `/api` fallback that keeps existing workflows working, and
graceful degradation when the backend is unreachable (FR-008, FR-010, FR-011).

**Independent Test**: Run the compose stack with `BACKEND_UPSTREAM` unset and confirm same-origin
behavior; then override it and confirm the SPA talks to the alternate backend; then stop a backend
and confirm a clear error with no crash.

### Implementation for User Story 2

- [x] T020 [US2] Validate same-origin `/api` fallback and graceful degradation: run the SPA image
  with `BACKEND_UPSTREAM` unset, then `docker compose stop bus-catcher-backend` and reload the SPA —
  expect a clear, user-friendly error with no crash or hang (`quickstart.md` scenario 9)
- [x] T021 [US2] Validate env-configurable upstream: override `BACKEND_UPSTREAM` for one SPA service
  to point at a different module's backend in `docker-compose.yml` (or `.env`) and confirm requests
  target that backend, proving the connection is configurable through env without code changes
  (FR-008 compose-side)

**Checkpoint**: At this point User Story 2 works independently.

---

## Phase 5: User Story 6 - Standard Definition & Gap Assessment (Priority: P1)

**Goal**: Publish the written module standard and the per-module gap assessment (FR-012, FR-016,
FR-017). Full module conformance is deferred; only the two documents are delivered here.

**Independent Test**: Read `docs/module-standard.md` and `docs/module-gap-assessment.md`; confirm the
standard defines the base-URL convention and identity/layout, and the assessment records every
module's conformance status.

### Implementation for User Story 6

- [x] T022 [US6] Create `docs/module-standard.md` with the identity/layout and backend base-URL
  sections (contract in
  `specs/004-local-setup-standardization/contracts/base-url.md` and
  `contracts/module-standard.md`)
- [x] T023 [US6] Create `docs/module-gap-assessment.md` with the conformance framework and the
  per-module rows for base-url and tooling areas (bus-catcher, fly-over-tracker,
  procrastinator-tracker, current-time) per `contracts/module-standard.md`
- [x] T024 [US6] Validate the documentation deliverables via `quickstart.md` scenario 10: both files
  exist and satisfy FR-012/FR-016/FR-017

**Checkpoint**: At this point User Story 6 is complete; US3/US4/US5 extend these two documents
sequentially.

---

## Phase 6: User Story 3 - Standardized Module Documentation (Priority: P2)

**Goal**: Define the standard documentation outline (README/setup/AGENTS) and record each module's
conformance; applying the outline to the modules is deferred (FR-013).

**Independent Test**: Read `docs/module-standard.md` and confirm the outline covers README, setup,
and AGENTS sections in the required order; confirm `docs/module-gap-assessment.md` records each
module's documentation conformance.

### Implementation for User Story 3

- [x] T025 [US3] Add the documentation-outline section (README / setup / AGENTS mandatory section
  order) to `docs/module-standard.md` per `specs/004-local-setup-standardization/contracts/module-standard.md`
  (FR-013)
- [x] T026 [US3] Record per-module documentation conformance rows (bus-catcher,
  procrastinator-tracker non-conformant → deferred changes listed) in `docs/module-gap-assessment.md`

**Checkpoint**: User Story 3 is complete.

---

## Phase 7: User Story 4 - Standardized Component Workbench (Priority: P2)

**Goal**: Define the workbench requirements (story + written `.mdx` docs page per published
component, shared setup) and record each module's conformance; per-module storybook conformance is
deferred, and the compose Storybook mode (enabled by the foundational `Dockerfile.storybook` images)
is validated (FR-006, FR-014).

**Independent Test**: Open two modules' workbenches via the compose REST+Storybook mode and confirm
every published component has a preview and a docs page.

### Implementation for User Story 4

- [x] T027 [US4] Add the workbench-requirements section (story per published component, written
  `.mdx` docs page, shared Storybook setup) to `docs/module-standard.md` (FR-014)
- [x] T028 [US4] Record per-module workbench conformance rows in `docs/module-gap-assessment.md`,
  and re-run `quickstart.md` scenario 3 to confirm all four Storybook containers serve their
  workbenches with the `/api` proxy (FR-006)

**Checkpoint**: User Story 4 is complete.

---

## Phase 8: User Story 5 - Standardized Test Conventions (Priority: P2)

**Goal**: Define the shared test conventions (Vitest + Testing Library; component, page-flow, and
backend contract REST+MCP levels; test-first) and record each module's conformance; per-module test
changes are deferred (FR-015, SC-007).

**Independent Test**: Read the test-conventions section in `docs/module-standard.md`; run the
repository quality gates and confirm no regressions.

### Implementation for User Story 5

- [x] T029 [US5] Add the test-conventions section (Vitest + Testing Library; component / page-flow /
  backend contract REST and MCP levels; test-first per constitution IV) to `docs/module-standard.md`
  (FR-015)
- [x] T030 [US5] Record per-module test conformance rows in `docs/module-gap-assessment.md`
- [x] T031 [US5] Run the full repository quality gates — `pnpm lint`, `pnpm format`, `pnpm typecheck`,
  `pnpm test` — and confirm zero regressions (SC-007)

**Checkpoint**: All user stories are independently functional.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final acceptance and release-readiness

- [x] T032 [P] Run every scenario in `specs/004-local-setup-standardization/quickstart.md`
  end-to-end as the final acceptance pass (all five modes, single-module scope, no collisions,
  no-rebuild switching, data persistence, graceful degradation, docs deliverables)
- [x] T033 Coordinate `version-analyser` review of the module Dockerfile/nginx changes
  (`modules/*/Dockerfile.frontend`, new `Dockerfile.storybook`, `deploy/nginx.spa.conf`) to
  determine whether changesets/version bumps are required before any PR is opened

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all compose-mode validation in US1 and the
  Storybook-mode validation in US4.
- **User Stories**: US1, US2, US6 can each proceed once Foundational is done.
  - US1 (MVP) depends on Foundational (proxy + Storybook images).
  - US2 depends on US1 (it reuses the built compose stack).
  - US6 is independent of US1/US2 (pure docs) — can run in parallel.
  - US3, US4, US5 each depend on US6 (they extend the same two documents) and run sequentially.
- **Polish (Final Phase)**: Depends on all user stories being complete.

### User Story Dependencies

- **US1 (P1)**: After Foundational. No dependency on other stories.
- **US2 (P1)**: After US1 (reuses the stack).
- **US6 (P1)**: After Foundational; parallel to US1/US2.
- **US3, US4, US5 (P2)**: After US6, sequential (same files: `docs/module-standard.md`,
  `docs/module-gap-assessment.md`).

### Within Each User Story

- Compose file tasks before runtime validation tasks (US1: T010–T013 then T014–T018).
- Document sections before their gap-assessment rows (US6/US3/US4/US5).
- Validation tasks run last within each story.

### Parallel Opportunities

- Phase 2: T003–T009 all run in parallel (different module files).
- Phase 3: T010–T013 (compose wiring) before T014–T018 (validation) — validation tasks are
  sequential (share the same stack).
- US6 (T022–T024) can run in parallel with US1/US2.
- T032 and T033 (Polish) run in parallel.
- US3 → US4 → US5 must NOT run in parallel (they write the same two documents).

---

## Parallel Example: Foundational Images

```bash
# Launch all nginx-proxy fixes together (different module directories):
Task: "T003 nginx /api proxy + envsubst for bus-catcher (modules/bus-catcher/...)"
Task: "T004 nginx /api proxy + envsubst for fly-over-tracker (modules/fly-over-tracker/...)"
Task: "T005 nginx /api proxy + envsubst for procrastinator-tracker (modules/procrastinator-tracker/...)"

# Launch all Storybook images together:
Task: "T006 Dockerfile.storybook bus-catcher"
Task: "T007 Dockerfile.storybook fly-over-tracker"
Task: "T008 Dockerfile.storybook procrastinator-tracker"
Task: "T009 Dockerfile.storybook current-time"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (`docker-compose.yml` skeleton + `.env.example`).
2. Complete Phase 2: Foundational (nginx proxy + Storybook images — blocks US1).
3. Complete Phase 3: User Story 1 (compose wiring T010–T013, validation T014–T018, docs T019).
4. **STOP and VALIDATE**: run all five modes + single-module scope (quickstart scenarios 1–8).
5. Deploy/demo if ready — this is the MVP.

### Incremental Delivery

1. Setup + Foundational → images build.
2. US1 → single-command environment works (MVP) → validate → demo.
3. US2 → backend connection proven configurable via env + same-origin fallback → validate.
4. US6 → module standard + gap assessment published.
5. US3 → documentation outline defined; US4 → workbench requirements; US5 → test conventions.
6. Polish → full quickstart acceptance + version-analyser review.

### Parallel Team Strategy

- Team completes Setup + Foundational together.
- Once Foundational is done: Developer A on US1, Developer B on US6.
- After US1: Developer A on US2.
- After US6: one developer writes US3 → US4 → US5 sequentially (same documents).

---

## Notes

- [P] tasks = different files, no dependencies.
- [Story] label maps each task to its user story for traceability.
- No unit-test tasks were generated up front: the in-scope changes were Compose/Dockerfile/nginx
  artifacts validated via `quickstart.md`. The SPA `API_BASE_URL`/`baseUrl` source changes were
  later implemented as part of the conformance pass (see `docs/module-gap-assessment.md`).
- T033 (version-analyser review) completed pre-PR: three minor changesets for bus-catcher,
  fly-over-tracker, and procrastinator-tracker.
- The host-port table is fixed and authoritative: `specs/004-local-setup-standardization/contracts/ports.md`.
- Commit after each logical group; never run native dev and the compose stack against the same
  `data/` files concurrently (edge case).
- Stop at any checkpoint to validate the story independently.