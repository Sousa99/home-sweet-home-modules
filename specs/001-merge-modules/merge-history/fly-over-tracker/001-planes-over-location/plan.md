# Implementation Plan: Planes Over a Location (MVP)

**Branch**: `001-planes-over-location` | **Date**: 2026-09-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-planes-over-location/spec.md`

## Summary

Build the module's first MVP: answer "which planes are flying over a GPS point + radius".
A single shared service layer queries a free live aircraft feed (OpenSky Network, anonymous
tier), filters to the circular area, and maps results to a common `FlyOverResult` shape that
is exposed identically through a **REST** API and an **MCP** server. A React SPA lets the user
type coordinates + radius and lists the current aircraft over that area (manual refresh),
already styled with the Home Sweet Home theme and reusable components for the final look and
feel. No caching, no persistence, no interpolation — the current status is mapped directly
from the feed per request.

## Technical Context

**Language/Version**: Node 24 LTS, TypeScript (ESM, strict)

**Primary Dependencies**:
- Backend: `hono`, `@hono/node-server`, `zod` (v4), `@hono/zod-validator`,
  `@modelcontextprotocol/server`, `@modelcontextprotocol/hono`, `pino`, `pino-http`,
  `pino-pretty` (dev)
- Frontend: existing `react@19`, `vite`, `tailwindcss@4`, `vitest`, Storybook — no new deps
  required

**Storage**: None — no database, no caching, no interpolation. The feed is queried per
request.

**Testing**: Vitest (workspace), `hono/testing` `testClient` for REST contract tests,
in-process MCP client-vs-handler for parity, Testing Library for SPA components. Feed mocked
in all tests.

**Target Platform**: Node 24 server (Docker/Linux), browser SPA

**Project Type**: Web application (backend + frontend monorepo, two packages)

**Performance Goals**: 95% of queries return in <2s (measured request→response, mostly the
upstream feed round-trip); SPA shows results <3s after submit

**Constraints**: Respect OpenSky anonymous tier (400 credits/day, 10 credits/s, 10s time
resolution); radius cap (default max 500 km); no stale data presented as fresh on feed outage

**Scale/Scope**: MVP — single query endpoint, one MCP tool, one SPA page; 10 concurrent
queries without degradation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The `.specify/memory/constitution.md` file is the unfilled template (no ratified principles or
gates). The module's governing docs (`setup.md`, `docs/clarify.md`, `AGENTS.md`) require:
- Single dual-mode backend package (REST `--http` + MCP `--mcp`, one shared service layer) ✅
- Single frontend package (SPA + Storybook + components library from the same source) ✅
- Quality gates: `pnpm lint`, `pnpm format`, `pnpm test`, `pnpm typecheck`,
  `node scripts/scaffold.mjs --check` pass before merge ✅
- Hand-written runtime defaults (ports, server name, db filename) per `docs/clarify.md` ✅
- Living documentation — JSDoc and docs updated in the same change as the code ✅

**No violations.** Complexity is deliberately low: no storage layer, no auth, one endpoint,
one tool, one service. No complexity-tracking table required.

## Project Structure

### Documentation (this feature)

```text
specs/001-planes-over-location/
├── spec.md               # Feature specification
├── plan.md               # This file
├── research.md           # Phase 0 output (technology decisions)
├── data-model.md         # Phase 1 output (domain model)
├── contracts/            # Phase 1 output (REST + MCP contracts)
├── quickstart.md         # Phase 1 output (validation guide)
└── tasks.md              # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
backend/
├── package.json          # deps added: hono, @hono/node-server, zod, @hono/zod-validator,
│                         # @modelcontextprotocol/server, @modelcontextprotocol/hono,
│                         # pino, pino-http (+ pino-pretty dev)
├── http/
│   └── fly-overs.http    # REST request collection (one per domain)
└── src/
    ├── index.ts          # --http / --mcp dispatch, boots the right server
    ├── lib/
    │   ├── config.ts     # env-driven runtime defaults (ports, max radius, feed URL, timeouts)
    │   ├── logger.ts     # pino: JSON prod / pino-pretty dev / silent test
    │   └── errors.ts     # AppError hierarchy + error → HTTP response mapper
    ├── domain/
    │   ├── schemas.ts    # shared zod v4 schemas (query, aircraft, result)
    │   └── types.ts      # z.infer domain types
    ├── geometry.ts       # bbox-from-circle + haversine distance (pure functions)
    ├── feeds/
    │   ├── types.ts      # AircraftFeed interface
    │   ├── opensky.ts    # OpenSky client (anonymous, bbox query)
    │   └── mock.ts       # deterministic mock feed (tests / offline dev)
    ├── services/
    │   └── flyOverService.ts   # shared: validate → query → filter → map
    ├── http/
    │   ├── app.ts        # Hono app: routes, logger middleware, onError/notFound
    │   └── routes.ts     # GET /api/fly-overs handler
    ├── mcp/
    │   └── server.ts     # createMcpHonoApp + createMcpHandler factory, planes_over tool
    └── tests/            # unit, contract, parity tests (Vitest)

frontend/
├── index.html            # NEW — SPA entry HTML
└── src/
    ├── main.tsx          # NEW — ReactDOM entry
    ├── App.tsx           # NEW — app shell + layout (look/feel for final)
    ├── index.ts          # NEW — library entry (required by vite.lib.config.ts)
    ├── api/
    │   └── client.ts     # fetch wrapper for GET /api/fly-overs
    └── components/
        ├── FlyOverForm.tsx    # lat / lng / radius inputs + submit (ui/Input, Label, Button)
        ├── FlyOverList.tsx    # aircraft list (empty / loading / error states)
        ├── AircraftCard.tsx   # per-plane card (ui/Card, Badge)
        ├── index.ts           # library exports
        └── __tests__/         # Vitest + Testing Library
```

**Structure Decision**: Two existing packages (`backend`, `frontend`) per the module's fixed
package organization. No third package is introduced; shared utilities live per-package
(`backend/src/lib`, `frontend/src/lib`). The feature spans both packages because the spec
requires backend (REST + MCP) and frontend (SPA + components) capability.

## Complexity Tracking

> None required — Constitution Check passed without violations.