# Implementation Plan: Next Bus Times (Basic Module Setup)

**Branch**: `feature/001-next-bus-times` | **Date**: 2026-09-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-next-bus-times/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

First real feature of the module: a functioning backend (REST + MCP) and
frontend SPA that lets the user configure a set of Lisbon bus stops (with
optional per-stop line filters), persists that configuration, and shows the
next scheduled buses (line, destination, scheduled passing time, countdown)
per stop. Schedule data comes from the Carris static GTFS feed, ingested
locally, behind a provider abstraction that leaves a seam for future realtime
ETA (GO/TML GTFS-RT TripUpdates/VehiclePositions merged at the DTO level — see
`research.md` §9; a separate future feature, e.g. `002-live-eta`). The feature
also bootstraps the app skeleton (backend entrypoints + DB, SPA entry) that
the template scaffold intentionally left empty.

## Technical Context

**Language/Version**: Node 24, TypeScript (strict; shared presets from
`@sousa99/homesweethome-config`)

**Primary Dependencies**:
- backend: `hono` + `@hono/node-server` (REST), `@modelcontextprotocol/sdk`
  (MCP), `drizzle-orm` + `better-sqlite3`, `zod`, `dotenv`
- frontend: `@tanstack/react-query` v5, `vite`, `react` 19, `tailwindcss` v4

**Storage**: SQLite at `./data/bus-catcher.db` via `better-sqlite3` +
`drizzle-orm`; schema in `backend/src/db/schema.ts` (see
[data-model.md](data-model.md))

**Testing**: Vitest — backend service/unit tests (service-day resolution,
DST/`>24h` time handling, next-times query, config CRUD, provider parsing)
and Hono `app.request()` route/contract tests; frontend component tests with
Testing Library + mocked TanStack Query

**Target Platform**: Linux/Node server for backend; modern evergreen browsers
for the SPA (Home Sweet Home dashboard environment)

**Project Type**: Web application (frontend + backend workspace packages)

**Performance Goals**: dashboard render < 2 s (SC-002); GTFS ingest < 2 min;
`GET /api/stops/:id/times` returns in < 200 ms p95 (indexed query)

**Constraints**: REST and MCP MUST share one service layer; single user, no
auth; scheduled times only for v1 with a provider seam for realtime ETA (GO/TML
GTFS-RT later — merged predictions, same `Passing[]` DTO); UTC canonical
internally, Europe/Lisbon display (DST-aware)

**Scale/Scope**: 1 home user; ~2,300 stops, ~176 lines, ~2.4 M stop_times in
the ingested feed; SPA with dashboard + config panel

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **II Freshness-Aware Realtime**: freshness surfaced via `GET /api/status`
  + dashboard last-refresh indicator; stale data flagged, never shown as live
  (FR-009). ✅
- **III Provider Abstraction**: `ScheduleProvider` interface; v1
  `CarrisGtfsProvider` (scheduled), seam for GO/TML GTFS-RT ETA later;
  swapping providers must not change the application contract (FR-010). ✅
- **IV Test-First (NON-NEGOTIABLE)**: tests for GTFS parsing, calendar/service-
  day resolution, time/DST/`>24h`, next-times query, config CRUD, and
  route/tool contracts written before implementation. ✅
- **V Observability & Correct Time Handling**: structured logging on
  ingest/refresh/provider calls; UTC canonical, Europe/Lisbon display, DST
  handled. ✅
- **Data & Integration Constraints**: zod validation on ingest (skip + warn,
  never crash); single-flight refresh; rate-limit-aware fetch; no PII
  (locations coarse). ✅
- **Quality gates**: `pnpm lint`, `pnpm format`, `pnpm test`,
  `pnpm typecheck`, `node scripts/scaffold.mjs --check` all pass before merge
  (typecheck/test become meaningful with this feature's source). ✅
- **Complexity**: provider abstraction + shared service layer are mandated by
  the constitution and the user's future-ETA requirement — not unjustified.
  No gate violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-next-bus-times/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── rest-api.md
│   └── mcp-tools.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── index.ts            # --http / --mcp dispatch
│   ├── config.ts           # runtime defaults (ports, db path, feed url)
│   ├── http/
│   │   ├── app.ts          # Hono app (routes under /api)
│   │   └── server.ts       # @hono/node-server bootstrap (:3000)
│   ├── mcp/
│   │   └── index.ts        # MCP server + tools (:3001/mcp)
│   ├── db/
│   │   ├── client.ts       # better-sqlite3 + drizzle
│   │   ├── schema.ts       # drizzle schema (see data-model.md)
│   │   └── migrate.ts
│   ├── providers/
│   │   ├── types.ts        # ScheduleProvider interface (seam)
│   │   └── carris/
│   │       ├── gtfs.ts     # download + parse
│   │       ├── ingest.ts   # batched import into db
│   │       └── queries.ts  # next-times query
│   ├── services/
│   │   ├── schedule.ts     # next passing times
│   │   ├── config.ts       # configured-stops CRUD
│   │   └── refresh.ts      # single-flight refresh
│   └── lib/
│       ├── schemas.ts      # zod DTO/schema source of truth
│       ├── time.ts         # GTFS minutes, Europe/Lisbon, DST
│       └── logger.ts       # structured logging
├── tsconfig.json
└── package.json

frontend/
├── index.html
├── tsconfig.json
├── src/
│   ├── main.tsx            # root + QueryClientProvider
│   ├── App.tsx             # layout/tabs: Dashboard | Config
│   ├── pages/
│   │   ├── Dashboard.tsx   # configured stops + next times + freshness
│   │   └── Config.tsx      # stop search + line filter + save
│   ├── api/
│   │   ├── client.ts       # typed fetch client
│   │   └── queries.ts      # TanStack Query hooks (useStops, useStopTimes,
│   │                       #   useConfig, useAddStop, useUpdateStop,
│   │                       #   useRemoveStop, useRefresh)
│   ├── components/
│   │   ├── ui/             # existing primitives (button, card, input, badge)
│   │   ├── StopSearch.tsx
│   │   ├── StopTimesList.tsx
│   │   └── ConfigPanel.tsx
│   └── lib/utils.ts        # cn (existing)
├── vite.config.ts          # existing (/api → :3000 proxy)
└── package.json

tests live alongside source (Vitest `*.test.ts[x]`), plus route/contract
tests using Hono `app.request()` in backend/src/**/*.test.ts.
```

**Structure Decision**: Option 2 (web application) — the template's existing
`backend/` + `frontend/` workspace packages. Backend layers: `http`/`mcp`
(adapters) → `services` (shared business logic) → `providers` + `db`
(data). Zod schemas centralized in `lib/schemas.ts` as the contract source of
truth consumed by both REST and MCP. This feature also creates the missing
bootstrap files (`backend/src/index.ts`, package `tsconfig.json`,
`frontend/index.html`/`main.tsx`/`App.tsx`) — the template scaffold shipped
empty on purpose.

## Complexity Tracking

No constitution violations to justify. The provider abstraction and the
shared service layer across REST/MCP are constitution mandates (principles
III and the Data & Integration Constraints), and the zod-DTO boundary is a
user requirement; none are optional complexity.