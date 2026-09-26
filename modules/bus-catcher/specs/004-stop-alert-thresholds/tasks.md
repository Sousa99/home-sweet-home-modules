---

description: "Task list for per-stop departure alert thresholds"

---

# Tasks: Per-Stop Departure Alert Thresholds

**Input**: Design documents from `/specs/004-stop-alert-thresholds/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Test tasks are INCLUDED — the project constitution (Principle IV,
Test-First, NON-NEGOTIABLE) requires dedicated tests written and confirmed
failing before implementation. New logic covered: backend threshold
validation/defaults, frontend urgency-level derivation, and dot rendering.

**Organization**: Tasks are grouped by user story to enable independent
implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/` (per plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify the starting point before any changes

^- [x] T001 Run the baseline quality gates (`pnpm lint`, `pnpm format`, `pnpm test`, `pnpm typecheck`, `node scripts/scaffold.mjs --check`) and confirm all pass before implementation

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types that BOTH user stories depend on

^- [x] T002 [P] Add `DepartureThresholds` interface (`headsUpMinutes`, `leaveNowMinutes`, `missedMinutes`, all non-negative integers) to `frontend/src/api/types.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Configure departure thresholds for a stop (Priority: P1) 🎯 MVP

**Goal**: The user can set and change three threshold values (heads-up / leave now / missed, in minutes) for each configured stop; values persist, are validated, and unset values resolve to defaults 10 / 5 / 1.

**Independent Test**: Add a stop with thresholds via `POST /api/config/stops`, confirm the response and `GET /api/config` return them; `PUT` one threshold field and confirm others are kept; submit out-of-order/negative values and confirm `400 invalid_body` with no partial save; edit the same stop in the SPA Config panel and confirm values round-trip.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

^- [x] T003 [P] [US1] Write backend config tests in `backend/src/services/config.test.ts`: create/update persist thresholds, defaults (10/5/1) resolve on read when unset, ordering validation (`headsUp >= leaveNow >= missed`), negative/out-of-order rejected, partial update validates against stored values
^- [x] T004 [P] [US1] Write ConfigPanel test in `frontend/src/components/ConfigPanel.test.tsx`: editing a stop shows three threshold inputs, saving round-trips values, invalid values surface a user-friendly error

### Implementation for User Story 1

^- [x] T005 [P] [US1] Add nullable integer columns `heads_up_min`, `leave_now_min`, `missed_min` to `configured_stops` in `backend/src/db/schema.ts`
^- [x] T006 [US1] Generate and apply the Drizzle migration with `pnpm db:generate` then `pnpm db:migrate` in `backend/drizzle/` (depends on T005)
^- [x] T007 [P] [US1] Extend zod schemas in `backend/src/lib/schemas.ts`: add `thresholds?: { headsUpMinutes?, leaveNowMinutes?, missedMinutes? }` (non-negative int) to `createConfigStopBodySchema` and `updateConfigStopBodySchema`, and add resolved `thresholds: { headsUpMinutes, leaveNowMinutes, missedMinutes }` to `configStopSchema`
^- [x] T008 [US1] Implement threshold persistence, defaults resolution (constants 10/5/1 in one backend source of truth), and ordering validation (against stored values on partial update) in `backend/src/services/config.ts` (depends on T005, T006, T007; HTTP routes in `backend/src/http/app.ts` need no changes)
^- [x] T009 [P] [US1] Add thresholds to the frontend API: `ConfigStop` gains `thresholds` in `frontend/src/api/types.ts` and `thresholds` field in add/update bodies in `frontend/src/api/client.ts` (depends on T002)
^- [x] T010 [US1] Add threshold editing UI (three number inputs for heads-up / leave now / missed + inline validation errors) to `frontend/src/components/ConfigPanel.tsx` (depends on T009)
^- [x] T011 [P] [US1] Add `thresholds` fields to the MCP `update_stop` input schema in `backend/src/mcp/index.ts` (depends on T007; `add_stop` inherits them via `createConfigStopBodySchema`; REST and MCP share the service layer per constitution)

**Checkpoint**: User Story 1 fully functional and testable independently

---

## Phase 4: User Story 2 - See how urgent each upcoming bus is (Priority: P1)

**Goal**: Each bus row shows a small colored dot (green / amber / orange / dark slate) derived from the stop's thresholds and the bus's `minutesUntil`, in both the SPA dashboard and the published `StopCard` widget (single shared implementation).

**Independent Test**: With default thresholds (10/5/1), buses at `minutesUntil` 25 / 10 / 5 / 1 / 0 render green / amber / orange / dark-slate / dark-slate respectively (at-or-below boundaries). A `StopCard` rendered with a custom `thresholds` prop changes the dots accordingly. Storybook shows the level variants; `pnpm --filter ./frontend build:lib` publishes the same logic and types.

### Tests for User Story 2 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

^- [x] T012 [P] [US2] Write `urgencyLevel` boundary tests in `frontend/src/lib/urgency.test.ts`: strictest-first ordering, at-or-below boundaries (exactly at each threshold), `minutesUntil <= 0` always missed, defaults when thresholds omitted, live and scheduled rows identical
^- [x] T013 [P] [US2] Write dot-rendering tests in `frontend/src/components/StopTimesList.test.tsx`: each row shows a dot of the expected hue class for its level and no text label; existing Live/Schedule pills unaffected
^- [x] T019 [P] [US2] Write StopCard tests in `frontend/src/components/StopCard.test.tsx`: rendering without `thresholds` uses defaults, with `thresholds` applies them (depends on T016 to pass)

### Implementation for User Story 2

^- [x] T014 [P] [US2] Implement `frontend/src/lib/urgency.ts`: `UrgencyLevel` type, `urgencyLevel(minutesUntil, thresholds)` with strictest-first `<=` semantics, and a dot-hue mapping (`bg-green-500` / `bg-amber-500` / `bg-orange-500` / `bg-slate-900`)
^- [x] T015 [P] [US2] Render a small dot (`h-2 w-2 rounded-full`, no label) at the start of each row in `frontend/src/components/StopTimesList.tsx` using the urgency module (depends on T014)
^- [x] T016 [P] [US2] Add optional `thresholds?: DepartureThresholds` prop to `frontend/src/components/StopCard.tsx` and thread it to `StopTimesList`, applying documented defaults when omitted (depends on T014)
^- [x] T017 [US2] Export `DepartureThresholds` and `UrgencyLevel` types from `frontend/src/index.ts` (depends on T016)
^- [x] T018 [US2] Pass each stop's `thresholds` from config to `StopCard` in `frontend/src/pages/Dashboard.tsx` (depends on T016 and T009)
^- [x] T020 [P] [US2] Update `frontend/src/components/StopCard.stories.tsx` and `StopCard.mdx`: add `thresholds` control and variants `Relaxed` (25 min), `HeadsUp` (10), `LeaveNow` (5), `Missed` (1 + a 0-min row), `CustomThresholds`; keep existing state stories working under defaults (depends on T016, T014)

**Checkpoint**: User Stories 1 and 2 both work independently

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Cross-cutting validation and living documentation

^- [x] T021 Run the `quickstart.md` validation end-to-end: API round-trip, partial update, validation failures, dashboard dots, threshold-crossing on refresh, Storybook variants, and `pnpm --filter ./frontend build:lib` publishing the `thresholds` prop plus `DepartureThresholds`/`UrgencyLevel` types
^- [x] T022 [P] Run all gates (`pnpm lint`, `pnpm format`, `pnpm test`, `pnpm typecheck`, `node scripts/scaffold.mjs --check`) and confirm green
^- [x] T023 [P] Confirm `contracts/rest-api.md`, `contracts/urgency-levels.md`, and `contracts/stop-card-component.md` match the implemented behavior (living documentation)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - T002 unblocks US1 frontend and US2 prop typing
- **User Stories (Phase 3+)**: US1 (config) is the data foundation; US2 (display) is independently implementable with defaults alone but is sequenced after US1 for the config-driven full flow
- **Polish (Final Phase)**: Depends on US1 and US2

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (works with defaults alone); full value requires US1's persisted thresholds

### Within Each User Story

- Tests MUST be written and FAIL before implementation (constitution IV)
- Backend: schema → migration → schemas → service (before endpoints - none change)
- Frontend: types → module/UI → integration

### Parallel Opportunities

- T002 (foundational type) runs alongside any setup task
- In US1: T003/T004 (tests) parallel; T005/T007 parallel; T009 parallel to backend work; T011 after T007
- In US2: T012/T013/T019 (tests) parallel; T014/T016 parallel; T015 after T014; T017/T018/T020 branch from T016
- Backend (US1) and frontend (US2) can proceed on separate tracks after Foundational

---

## Parallel Example: User Story 2

```bash
Task: "Write urgencyLevel boundary tests in frontend/src/lib/urgency.test.ts"
Task: "Write dot-rendering tests in frontend/src/components/StopTimesList.test.tsx"
# then, in parallel:
Task: "Implement frontend/src/lib/urgency.ts"
Task: "Add optional thresholds prop to frontend/src/components/StopCard.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (T002)
3. Complete Phase 3: User Story 1 (config + persistence + validation)
4. **STOP and VALIDATE**: User Story 1 independently (API round-trip + ConfigPanel edit)
5. Continue to User Story 2 (display), then Polish

### Incremental Delivery

1. Foundation ready → thresholds stored and validated (MVP)
2. Add User Story 2 → dots on every bus row in SPA + published component
3. Polish → quickstart validation, gates, living contracts

### Parallel Team Strategy

With two developers:
- Developer A: User Story 1 (backend + ConfigPanel)
- Developer B: User Story 2 after T002 (urgency module + StopCard + Storybook)
- Both integrate in Polish phase

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (constitution IV, Test-First)
- Commit after each task or logical group
- The published component and the SPA must share the same `urgency.ts` logic - never duplicate (single shared implementation, spec 003)
- HTTP routes (`backend/src/http/app.ts`) need no changes; schemas and service carry the contract