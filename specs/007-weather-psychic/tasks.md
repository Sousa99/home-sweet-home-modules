---

description: "Task list for weather-psychic feature implementation"
---

# Tasks: Weather Psychic

**Input**: Design documents from `/specs/007-weather-psychic/`

**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required for user stories),
[research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: Included. Test-first is NON-NEGOTIABLE (constitution Principle IV + `test-first` skill):
every behavior task starts with a failing Vitest test, then implementation, then a green run.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing
of each story. Backend and frontend work independently within stories; the frontend widgets are
testable with injected fetchers (no live backend required).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Module root: `modules/weather-psychic/`
- Backend (REST + MCP): `modules/weather-psychic/backend/`
- Frontend (SPA + lib + Storybook): `modules/weather-psychic/frontend/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic module structure

- [x] T001 Create `modules/weather-psychic/` module scaffold: root `eslint.config.mjs`, `prettier.config.mjs`, `tsconfig.base.json` extending `@sousa99/homesweethome-config`, plus empty `backend/` and `frontend/` directories (git keep)
- [x] T002 [P] Create backend package manifest `modules/weather-psychic/backend/package.json` (`@sousa99/weather-psychic-backend`, type module, engines node>=24, scripts dev/dev:mcp/start/start:mcp/build/test/test:watch/typecheck, deps: hono, @hono/node-server, @hono/zod-validator, @modelcontextprotocol/sdk, zod, dotenv; devDeps: tsx, vitest, typescript, @types/node)
- [x] T003 [P] Create frontend package manifest `modules/weather-psychic/frontend/package.json` (`@sousa99/weather-psychic-components`, scripts dev/build/build:lib/build:css/storybook/build-storybook/test/test:watch/typecheck, exports `"."`→dist-lib and `"./styles.css"`, deps react/react-dom/react-router/lucide-react/@tanstack/react-query; devDeps vitest/jsdom/@storybook/react-vite+addon-docs/@tailwindcss/vite+cli/tailwindcss/vite-plugin-dts/@sousa99/homesweethome-components workspace:*)
- [x] T004 [P] Register the module's fixed release group `["@sousa99/weather-psychic-backend", "@sousa99/weather-psychic-components"]` in `.changeset/config.json`
- [x] T005 [P] Add `modules/weather-psychic/backend/tsconfig.json` and `modules/weather-psychic/backend/vitest.config.ts`
- [x] T006 [P] Add `modules/weather-psychic/frontend/vite.config.ts` (SPA dist-app, dev proxy `/api` → `http://localhost:3000`), `vite.lib.config.ts` (dist-lib + vite-plugin-dts, external react/react-dom/lucide-react), `vitest.config.ts`, `tsconfig.json`, and `index.html`
- [x] T007 [P] Add `modules/weather-psychic/frontend/.storybook/main.ts` (react-vite + addon-docs + Tailwind in viteFinal, stories glob `../src/**/*.mdx` + `*.stories.@(ts|tsx)`) and `.storybook/preview.ts` (imports `../src/index.css`)
- [x] T008 [P] Create `modules/weather-psychic/frontend/src/index.css` (Tailwind v4 `@import 'tailwindcss'`, `@source "../../../../packages/components/src"`, `@theme { --color-primary: #d97706 }`, fonts)
- [x] T009 [P] Create `modules/weather-psychic/frontend/src/test/setup.ts` (jest-dom/vitest + `cleanup` in `afterEach`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Backend foundation

- [x] T010 [P] Create shared domain types `modules/weather-psychic/backend/src/domain/types.ts` (`Location`, `CurrentWeather`, `HourlyEntry`, `DailyEntry`, `Forecast` per `data-model.md`)
- [x] T011 Create shared zod schemas `modules/weather-psychic/backend/src/domain/schemas.ts` (`LocationSchema`, `LocationQuerySchema`, `ForecastQuerySchema`, `CurrentWeatherSchema`, `HourlyEntrySchema`, `DailyEntrySchema`, `ForecastSchema`; lat/lng ranges, query min 2 chars) — depends on T010
- [x] T012 [P] Create WMO-code mapping `modules/weather-psychic/backend/src/lib/conditions.ts` (weather_code 0–99 → `{ label, iconKey }`)
- [x] T013 [P] Create zod-validated config `modules/weather-psychic/backend/src/lib/config.ts` (`PORT` 3000, `MCP_PORT` 3001, `HOST`, `FEED` = `mock|open-meteo`)
- [x] T014 [P] Create shared error taxonomy `modules/weather-psychic/backend/src/lib/errors.ts` (`AppError`, `ValidationError`, `ProviderUnavailableError`, `toErrorResponse` → `{ error: { code, message } }`, `errorStatus`)
- [x] T015 [P] Create minimal JSON logger `modules/weather-psychic/backend/src/lib/logger.ts`
- [x] T016 [P] Create feed seam `modules/weather-psychic/backend/src/feeds/types.ts` (`WeatherFeed`, `LocationFeed` interfaces)
- [x] T017 [P] Create deterministic mock feed `modules/weather-psychic/backend/src/feeds/mock.ts` (fixed fixture locations + forecast, offline/hermetic)
- [x] T018 Create weather service `modules/weather-psychic/backend/src/services/weatherService.ts` (validate against shared schemas → call feed → shape output: hourly starts at next local hour excluding current hour, daily starts tomorrow excluding today, ascending order, `generatedAt`) — depends on T011, T016, T017, T012
- [x] T019 [P] Write WMO-mapping unit test `modules/weather-psychic/backend/src/tests/unit/conditions.test.ts` FIRST (fixture covers 0, 2, 3, 45, 61, 80, 95; assert it fails before T012)
- [x] T020 [P] Write service unit test `modules/weather-psychic/backend/src/tests/unit/weather-service.test.ts` FIRST (hourly excludes current hour, daily excludes today, ascending order, `generatedAt` present; assert it fails before T018)

### Frontend foundation

- [x] T021 [P] Create shared response types `modules/weather-psychic/frontend/src/api/types.ts` mirroring backend schemas
- [x] T022 [P] Create base-url loader `modules/weather-psychic/frontend/src/api/baseUrl.ts` per the [base-url contract](../004-local-setup-standardization/contracts/base-url.md) (`loadApiBaseUrl`/`getApiBaseUrl`, `/config.json` + `API_BASE_URL` env, fallback same-origin `/api`; precedence `baseUrl` prop > env > same-origin)
- [x] T023 Create API client `modules/weather-psychic/frontend/src/api/client.ts` (`request<T>()` + typed `ApiError`, `api.searchLocations(query)`, `api.getForecast({ lat, lng })`, optional `baseUrl` arg per base-url contract) — depends on T022, T021
- [x] T024 [P] Create frontend WMO-condition mapping `modules/weather-psychic/frontend/src/lib/conditions.ts` (code → label + icon key, mirrored from backend fixture)
- [x] T025 [P] Create formatting helpers `modules/weather-psychic/frontend/src/lib/format.ts` (temperature, time, day-name formatting via `Intl`)
- [x] T026 [P] Write unit tests `modules/weather-psychic/frontend/src/lib/__tests__/conditions.test.ts`, `format.test.ts`, and `baseUrl.test.ts` FIRST (assert they fail before T024/T025/T022; `baseUrl.test.ts` locks the base-url precedence contract)

**Checkpoint**: Foundation ready — user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Current Weather in Detail (Priority: P1) 🎯 MVP

**Goal**: A `CurrentWeatherCard` widget rendering the current weather in a detailed, graphic format
(temperature, condition, feels-like, humidity, wind, precipitation probability, UV) with the shared
status bar, for a configurable location.

**Independent Test**: Render `CurrentWeatherCard` with an injected `fetchForecast` fixture; verify
the detailed current values render, the status bar shows "Last updated", and on a failing fetch the
widget keeps last-known data.

### Tests for User Story 1 ⚠️ (write FIRST, assert they FAIL)

- [x] T027 [P] [US1] Write component test `modules/weather-psychic/frontend/src/components/CurrentWeatherCard.test.tsx` (detailed current data renders; `WidgetStatusBar` on top shows `Last updated` from `lastUpdatedAt` + `Refresh` wired to refetch; `baseUrl` prop honored per the [base-url contract](../004-local-setup-standardization/contracts/base-url.md); error keeps last-known data)

### Implementation for User Story 1

- [x] T028 [P] [US1] Create UI primitives `modules/weather-psychic/frontend/src/components/ui/` (`Card`, `Badge`; amber/slate tokens)
- [x] T029 [US1] Implement `modules/weather-psychic/frontend/src/components/CurrentWeatherCard.tsx` (self-fetching via default client or injected `fetchForecast`, props `location`/`fetchForecast`/`baseUrl`/`refetchIntervalMs`/`className` per `contracts/frontend-api.md`; renders the current-weather detail section with icon by `weatherCode`+`isDay`)
- [x] T030 [US1] Integrate the shared `WidgetStatusBar` (`@sousa99/homesweethome-components`, per the [status-bar contract](../005-standardized-component-status/contracts/status-bar.md)) rendered on TOP of `CurrentWeatherCard.tsx` + a discriminated `LoadState` (loading/error/ready, keeps last-known data on error) deriving the `lastUpdatedAt`/`updating`/`error`/`onRefresh` props; `baseUrl` forwarded to the default client

**Checkpoint**: User Story 1 fully functional and testable independently

---

## Phase 4: User Story 2 - Hourly Forecast with Auto-Scrolling Graphic (Priority: P1)

**Goal**: An `HourlyStrip` inside `CurrentWeatherCard` showing the coming hours (excluding the
current hour) that auto-scrolls to the right, stops/wraps gracefully at the end, and respects
reduced motion.

**Independent Test**: Render the strip with a fixture where the current hour is present in the
payload; verify the strip never shows it, advances on an interval, and stops at the end of data.

### Tests for User Story 2 ⚠️ (write FIRST, assert they FAIL)

- [x] T031 [P] [US2] Write hook test `modules/weather-psychic/frontend/src/lib/__tests__/useAutoScroll.test.ts` (advances on interval, stops at end, disabled under `prefers-reduced-motion`; use fake timers)
- [x] T032 [P] [US2] Write component test `modules/weather-psychic/frontend/src/components/HourlyStrip.test.tsx` (excludes current hour, auto-scrolls, end-of-data stops, reduced-motion)

### Implementation for User Story 2

- [x] T033 [US2] Implement `modules/weather-psychic/frontend/src/lib/useAutoScroll.ts` (timer-driven scroll-to-right advance; reduced-motion guard)
- [x] T034 [P] [US2] Implement `modules/weather-psychic/frontend/src/components/HourlyStrip.tsx` (horizontal overflow-x strip, seeded to start at next hour — current hour excluded)
- [x] T035 [US2] Integrate `HourlyStrip` into `CurrentWeatherCard.tsx` (render below current detail; re-seed on hour boundary)

**Checkpoint**: User Story 1 AND 2 both work independently

---

## Phase 5: User Story 3 - Daily Forecast in a Compact List (Priority: P1)

**Goal**: A `DailyForecastCard` widget listing the upcoming days (starting tomorrow, today excluded)
as succinct day/condition/low-high summaries in a compact, scannable list.

**Independent Test**: Render `DailyForecastCard` with a fixture containing today; verify today is
absent, the first entry is tomorrow, and each entry shows a succinct summary (day, condition,
low/high).

### Tests for User Story 3 ⚠️ (write FIRST, assert they FAIL)

- [x] T036 [P] [US3] Write component test `modules/weather-psychic/frontend/src/components/DailyForecastCard.test.tsx` (starts tomorrow, today excluded, succinct per-day summary, 5-entry cap; `WidgetStatusBar` on top with `Last updated` + `Refresh`; `baseUrl` prop honored; error keeps last-known data)

### Implementation for User Story 3

- [x] T037 [US3] Implement `modules/weather-psychic/frontend/src/components/DailyForecastCard.tsx` (self-fetching, props `location`/`fetchForecast`/`baseUrl`/`refetchIntervalMs`/`className`; renders compact list from the `daily` slice; shared `WidgetStatusBar` on top per the status-bar contract, same `LoadState` wiring as `CurrentWeatherCard`)

**Checkpoint**: User Story 1, 2 AND 3 all work independently

---

## Phase 6: User Story 4 - Selectable, Configurable Location (Priority: P1)

**Goal**: A `LocationSelector` (debounced search + select) bound to a `useLocation` hook that
persists the choice in local storage, plus the SPA `DashboardPage` composing the selector with both
widgets.

**Independent Test**: Render `LocationSelector` with an injected `searchLocations` fixture; type,
select a result, and assert `onChange` fires. Verify `useLocation` seeds from storage, persists on
change, and falls back on invalid values.

### Tests for User Story 4 ⚠️ (write FIRST, assert they FAIL)

- [x] T038 [P] [US4] Write component test `modules/weather-psychic/frontend/src/components/LocationSelector.test.tsx` (debounced search, result select → `onChange`)
- [x] T039 [P] [US4] Write hook test `modules/weather-psychic/frontend/src/lib/__tests__/useLocation.test.ts` (seed from stored `weather-psychic:location`, persist on change, invalid-value fallback)
- [x] T040 [P] [US4] Write SPA test `modules/weather-psychic/frontend/src/pages/DashboardPage.test.tsx` (selector + both widgets compose; choosing a location updates both widgets)

### Implementation for User Story 4

- [x] T041 [P] [US4] Implement `modules/weather-psychic/frontend/src/components/LocationSelector.tsx` (controlled `value`/`onChange`, injectable `searchLocations`, `baseUrl` per base-url contract, placeholder)
- [x] T042 [P] [US4] Implement `modules/weather-psychic/frontend/src/lib/useLocation.ts` (localStorage key `weather-psychic:location`, resolved `Location` persistence, invalid-value fallback)
- [x] T043 [P] [US4] Implement TanStack Query hooks `modules/weather-psychic/frontend/src/api/queries.ts` (`useSearchLocations`, `useForecast`, query keys, refetch cadence, optional `baseUrl` arg)
- [x] T044 [US4] Implement `modules/weather-psychic/frontend/src/pages/DashboardPage.tsx` composing `LocationSelector` (bound to `useLocation`) + `CurrentWeatherCard` + `DailyForecastCard`
- [x] T045 [US4] Wire the SPA shell: `modules/weather-psychic/frontend/src/App.tsx` (route `/` → `DashboardPage`) and `src/main.tsx` (`loadApiBaseUrl()` bootstrap + `QueryClientProvider`)

**Checkpoint**: User Story 4 fully functional — the SPA is complete and testable independently

---

## Phase 7: User Story 5 - Weather Data via the Application Interfaces (Priority: P2)

**Goal**: The backend REST API (`GET /api/health`, `GET /api/locations/search`, `GET /api/weather`)
and MCP server (tools `weather.search`, `weather.get_forecast`) return consistent data built from
the shared schemas (REST ↔ MCP parity by construction), including the live Open-Meteo feed.

**Independent Test**: With `FEED=mock`, call the REST endpoints and the MCP tools for the same
coordinate/query and assert the payloads deep-equal; a 400 is returned for invalid queries.

### Tests for User Story 5 ⚠️ (write FIRST, assert they FAIL)

- [ ] T046 [P] [US5] Write contract test `modules/weather-psychic/backend/src/tests/contract/rest-mcp-parity.test.ts` (REST response deep-equals MCP tool response for same coordinate + query, mock feed)
- [ ] T047 [P] [US5] Write contract test `modules/weather-psychic/backend/src/tests/contract/rest-contracts.test.ts` (200 shapes for health + weather + search, 400 validation, 404 unknown path)

### Implementation for User Story 5

- [ ] T048 [P] [US5] Implement `modules/weather-psychic/backend/src/http/app.ts` (Hono app: CORS on `/api/*`, `onError`, `notFound`, mounts routes sub-app)
- [ ] T049 [P] [US5] Implement `modules/weather-psychic/backend/src/http/routes.ts` (`weatherRoutes(service)`: `GET /api/health`, `GET /api/locations/search` via `LocationQuerySchema`, `GET /api/weather` via `ForecastQuerySchema` with `zValidator`)
- [ ] T050 [P] [US5] Implement `modules/weather-psychic/backend/src/mcp/server.ts` (`createMcpApp`: tools `weather.search` + `weather.get_forecast` using the shared schemas; success/`isError` response helpers; streamable HTTP at `/mcp`)
- [ ] T051 [P] [US5] Implement live provider `modules/weather-psychic/backend/src/feeds/openMeteo.ts` (`WeatherFeed` + `LocationFeed` against `api.open-meteo.com/v1/forecast` and `geocoding-api.open-meteo.com/v1/search`; `timezone` param for local-time; provider failure → `ProviderUnavailableError`)
- [ ] T052 [US5] Implement dual-mode entry `modules/weather-psychic/backend/src/index.ts` (dotenv; require exactly one of `--http`/`--mcp`; select feed by `FEED` config; start REST or MCP server) — depends on T048-T051

**Checkpoint**: User Story 5 complete — REST and MCP are parity-tested and serve real weather

---

## Phase 8: User Story 6 - Component Workbench & Documentation (Priority: P2)

**Goal**: Storybook previews for both widgets and the selector with fixture locations, plus a
written documentation page.

**Independent Test**: Open Storybook and preview loading/ready/error/empty variants of both widgets
and the selector; read the written docs page.

### Implementation for User Story 6

- [ ] T053 [P] [US6] Create `CurrentWeatherCard.stories.tsx` (fixture `fetchForecast` variants: loading, ready, empty, error, reduced-motion)
- [ ] T054 [P] [US6] Create `DailyForecastCard.stories.tsx` (fixture variants: loading, ready, error, today-excluded)
- [ ] T055 [P] [US6] Create `LocationSelector.stories.tsx` (fixture `searchLocations`, search + select flow)
- [ ] T056 [P] [US6] Create written docs page `modules/weather-psychic/frontend/src/components/WeatherPsychic.mdx` (Meta/Canvas/ArgTypes covering both widgets + selector, embed snippet)

**Checkpoint**: All user stories independently functional and documented

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T057 [P] Create public export surface `modules/weather-psychic/frontend/src/index.ts` (export `CurrentWeatherCard`, `DailyForecastCard`, `LocationSelector` + their prop types + API types)
- [ ] T058 [P] Write exports test `modules/weather-psychic/frontend/src/lib/__tests__/exports.test.ts` locking the public surface (no internal members leak)
- [ ] T059 [P] Create module documentation `modules/weather-psychic/README.md`, `modules/weather-psychic/setup.md`, `modules/weather-psychic/AGENTS.md` following the [module-standard outline](../004-local-setup-standardization/contracts/module-standard.md) (README: Overview/Stack/Features/Prereqs/Getting Started/Quality Gates/Package/Embedding/Learn More; setup.md + AGENTS.md per the outline; document the Open-Meteo opt-in external integration)
- [ ] T060 [P] Create `modules/weather-psychic/Dockerfile.backend`, `Dockerfile.frontend`, `Dockerfile.storybook` + `frontend/deploy/` nginx entrypoint + `/api` proxy (per `specs/004-local-setup-standardization/contracts/compose.md` pattern)
- [ ] T061 [P] Update the host-port allocation `specs/004-local-setup-standardization/contracts/ports.md` (add weather-psychic row: REST `3104`, MCP `3204`, SPA `3304`, Storybook `3404`)
- [ ] T062 [P] Run a module-standard conformance self-check against the [conformance checklist](../004-local-setup-standardization/contracts/module-standard.md) (base-url, documentation, workbench, tests, tooling) for both weather-psychic packages and record results in `specs/007-weather-psychic/` notes
- [ ] T063 Run the validation scenarios in `specs/007-weather-psychic/quickstart.md` (mock-feed E2E via curl + MCP, live feed, SPA dashboard, embed check)
- [ ] T064 Run the full gate suite: `pnpm lint && pnpm format && pnpm typecheck && pnpm test` (all four gates green across the workspace)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately (T002/T003/T004/T005/T006/T007/T008/T009 parallelizable)
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - Frontend stories (US1-US4) proceed sequentially (each builds on the module's widgets), but US3 and US4 are largely independent files
  - Backend story (US5) can be staffed in parallel with frontend stories once Foundation is done
  - US6 depends on US1-US4 components existing
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Foundation — no dependencies on other stories
- **US2 (P1)**: Depends on US1 (integrates `HourlyStrip` into `CurrentWeatherCard`); its own hook/component files are new
- **US3 (P1)**: Can start after Foundation — independent files, may run parallel to US2
- **US4 (P1)**: Depends on US1 + US3 widgets (dashboard composes them) and Foundation API layer; `LocationSelector`/`useLocation` are independent files
- **US5 (P2)**: Can start after Foundation — entirely independent of frontend stories
- **US6 (P2)**: Depends on US1-US4 components (previews the widgets)

### Within Each User Story

- Tests MUST be written and FAIL before implementation (red → green → refactor)
- Services before endpoints; core implementation before integration
- Story complete and independently tested before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- Backend Foundation (T010-T020) and Frontend Foundation (T021-T026) run in parallel
- Once Foundation completes: US1-US3 frontend files + US5 backend can start in parallel
- All test tasks marked [P] within a story run in parallel
- US6 Storybook tasks all run in parallel

---

## Parallel Example: Backend + Frontend Foundation

```bash
# Backend foundation, together:
Task: "Create shared domain types backend/src/domain/types.ts"
Task: "Create WMO mapping backend/src/lib/conditions.ts"
Task: "Create zod-validated config backend/src/lib/config.ts"
Task: "Create feed seam backend/src/feeds/types.ts"

# Frontend foundation, together:
Task: "Create shared response types frontend/src/api/types.ts"
Task: "Create base-url loader frontend/src/api/baseUrl.ts"
Task: "Create formatting helpers frontend/src/lib/format.ts"
```

## Parallel Example: User Story 4 (location + SPA)

```bash
# Launch all US4 implementation files together:
Task: "Implement LocationSelector.tsx"
Task: "Implement useLocation.ts"
Task: "Implement api/queries.ts"
Task: "Implement DashboardPage.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently (`CurrentWeatherCard` with fixtures)
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently (MVP!)
3. Add User Story 2 (hourly auto-scroll) → Test independently
4. Add User Story 3 (daily list) → Test independently
5. Add User Story 4 (location + SPA) → Test independently
6. Add User Story 5 (backend REST + MCP) → parity-tested, real data
7. Add User Story 6 (workbench + docs) → test independently
8. Polish → gates green → quickstart validated

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 → US2 (current + hourly widget)
   - Developer B: US3 (daily widget) → US6 stories
   - Developer C: US5 (backend REST + MCP)
3. Team integrates US4 (SPA dashboard) once US1/US3 widgets + backend exist

---

## Notes

- `[P]` tasks = different files, no dependencies
- `[Story]` label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Verify tests fail before implementing (red → green)
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
- Avoid: vague tasks, same-file conflicts, cross-story dependencies that break independence