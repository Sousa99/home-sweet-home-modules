# Implementation Plan: Flight Destination Enrichment

**Branch**: `feature/003-flight-destination` | **Date**: 2026-09-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-flight-destination/spec.md`

## Summary

Backend-only expansion of the fly-over capability. The shared service (used by both the REST
`/api/fly-overs` endpoint and the MCP `planes_over` tool) now enriches **every matched aircraft**
with the flight's estimated destination — `destinationAirport` (ICAO code) and
`destinationCountry` — resolved live from OpenSky's authenticated flight data via the
`/flights/aircraft` endpoint, using an OAuth2 client-credentials token. Enrichment is
best-effort: bounded concurrency, an in-memory TTL cache, and a per-query
`destinationEnrichment` indicator (`complete | partial | unavailable`) so a rate-limited or
unconfigured destination source never fails the core fly-over answer (spec FR-006).

OpenSky HTTP 429 responses are now retried with bounded attempts honoring
`X-Rate-Limit-Retry-After-Seconds` (or a configured default), surfacing the existing
`503 rate_limited` error only after the attempts are exhausted; 401 triggers a single token
refresh and retry. The `/states/*` and `/flights/*` credit buckets are retried independently
(spec FR-009/FR-010).

OpenSky authentication requires OAuth2 client credentials (mandatory since 2026-03-18, basic auth
removed). Credentials come from environment (`OPENSKY_CLIENT_ID`/`OPENSKY_CLIENT_SECRET`) and are
**optional**: without them the system runs on the anonymous tier and enrichment is skipped
(`destinationEnrichment: 'unavailable'`), preserving today's behavior exactly (spec FR-008).

The feature also delivers a **feasibility evaluation** of showing the flight path line for matched
aircraft (spec FR-011 / Story 3) as a research artifact. Conclusion: **GO** for an on-demand,
per-selected-aircraft track feature (backend `/tracks` capability + map polyline), **not** for
all-flights-on-every-refresh; requires caching and a per-query cap. No path-line tooling is
implemented in this feature (user decision).

## Technical Context

**Language/Version**: TypeScript (ESM, strict), Node ≥ 24, zod v4

**Primary Dependencies**:
- Existing (unchanged): `hono`, `zod@4`, `pino`, `dotenv`, `@hono/zod-validator`, MCP SDK
  (`@modelcontextprotocol/hono`, `@modelcontextprotocol/server`)
- **New runtime dependencies: none.** OAuth2 token exchange, bounded 429/401 retry, the in-memory
  destination cache, and the ICAO→country map are implemented with plain `fetch` + `Map`/`AbortSignal`

**Storage**: None — an in-memory TTL cache for destination lookups (positive results, and a
shorter TTL for negative results) is process-scoped; no persistence (consistent with the MVP's
no-storage decision, `specs/001-planes-over-location/research.md` Decision 8).

**Testing**: Vitest. New unit tests for the OAuth2 token manager, the `fetchWithRetry` helper, the
OpenSky flight-route mapping, the ICAO→country lookup, and the destination cache; service tests
with a deterministic mock route feed (enrichment + partial/unavailable states); updated REST and
MCP contract/parity tests covering populated destinations and the new `destinationEnrichment`
field. Tests never hit the live feed (credit budget preserved).

**Target Platform**: Node server — both executions of the dual-mode backend (`--http` REST on
:3000, `--mcp` MCP on :3001), per `docs/clarify.md` package organization.

**Project Type**: Backend package of the two-package monorepo (REST + MCP on one shared service).

**Performance Goals**: Enrichment must not regress the feature-001 success criteria — 95% of
queries answered in under 2 seconds end-to-end; enrichment for a typical matched set (≤ ~20
aircraft) adds under ~1.5s with bounded concurrency (default 8), cached within the TTL window
(spec SC-003).

**Constraints**: OpenSky credits are per-endpoint-family buckets (`/states/*`, `/flights/*`,
`/tracks/*`) with independent daily quotas (anonymous 400, standard 4,000/day). The `/flights/*`
lookup window must not cross a UTC calendar-day boundary or the cost jumps from 4 to 30 credits
— the window is clamped to the current UTC day. Credentials must never be logged or echoed in
responses. `401` means the token expired — refresh once and retry.

**Scale/Scope**: Backend enrichment + retry/backoff; one additive frontend type-mirror update
(`frontend/src/api/types.ts`) to keep parity-by-construction; no UI change (the SPA already
renders `destinationAirport`/`destinationCountry`, `AircraftCard.tsx:27`); no new API surface —
the wire shape is extended additively.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The `.specify/memory/constitution.md` file is the unfilled template (no ratified principles or
gates), as in `specs/002-map-view-selection/plan.md`. The module's governing docs (`setup.md`,
`docs/clarify.md`, `AGENTS.md`) require:

- **Dual-mode backend package preserved** — REST and MCP share one service layer; parity by
  construction through the shared zod schemas ✅
- **Quality gates**: `pnpm lint`, `pnpm format`, `pnpm test`, `pnpm typecheck`,
  `node scripts/scaffold.mjs --check` pass before merge ✅
- **Living documentation** — JSDoc and docs updated in the same change as the code ✅
- **No new dependencies without justification** — none are added; plain `fetch` covers OAuth2 and
  retry ✅
- **Secrets discipline** — credentials are env/config only, never in code, logs, or responses ✅

**No violations.** Complexity is deliberately low: no storage, no new API surface, one new service
abstraction (`FlightRouteFeed`) kept separate from the existing `AircraftFeed` so each remains
independently mockable. No complexity-tracking table required.

## Project Structure

### Documentation (this feature)

```text
specs/003-flight-destination/
├── spec.md               # Feature specification
├── plan.md               # This file
├── research.md           # Phase 0 output (technology decisions, incl. path-line feasibility)
├── data-model.md         # Phase 1 output (domain model)
├── contracts/            # Phase 1 output (REST + MCP wire contracts)
├── quickstart.md         # Phase 1 output (validation guide)
└── tasks.md              # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
backend/src/
├── domain/
│   ├── schemas.ts               # UPDATE: FlyOverResultSchema += destinationEnrichment enum
│   │                             #        ('complete'|'partial'|'unavailable'); AircraftSchema unchanged
│   └── types.ts                 # UPDATE: FlyOverResult re-inferred
├── feeds/
│   ├── types.ts                 # UPDATE: add DestinationInfo + FlightRouteFeed interface
│   ├── opensky.ts               # UPDATE: auth Bearer header when configured; states 429 retry via lib/retry
│   ├── openskyAuth.ts           # NEW: OAuth2TokenManager (client-credentials exchange, 30-min expiry,
│   │                             #      proactive refresh + refresh-on-401)
│   ├── flightRoutes.ts          # NEW: OpenSkyFlightRouteFeed — GET /flights/aircraft?icao24&begin&end
│   │                             #      → estArrivalAirport; picks flight covering "now"
│   ├── mock.ts                  # UPDATE: fixture destinations for the 5 fixtures (buildStates)
│   └── mockRoutes.ts            # NEW: deterministic MockRouteFeed for tests/offline dev
├── lib/
│   ├── config.ts                # UPDATE: OPENSKY_CLIENT_ID/SECRET, OPENSKY_TOKEN_URL,
│   │                             #      RETRY_ATTEMPTS, RETRY_DEFAULT_MS, RETRY_CAP_MS,
│   │                             #      DEST_WINDOW_H (24), DEST_CONCURRENCY (8),
│   │                             #      DEST_CACHE_TTL_MS, DEST_NEGATIVE_TTL_MS
│   ├── retry.ts                 # NEW: fetchWithRetry — 429 → wait X-Rate-Limit-Retry-After-Seconds
│   │                             #      (or default) → retry (bounded); 401 → refresh once → retry once
│   ├── airports.ts              # NEW: ICAO → country static map (bundled, loaded once)
│   └── destinationCache.ts      # NEW: in-memory TTL cache (positive + negative entries)
├── services/
│   └── flyOverService.ts        # UPDATE: accepts route feed; after filtering, enriches aircraft
│                                 #      with bounded concurrency; sets destinationEnrichment
└── index.ts                     # UPDATE: wire OpenSkyFlightRouteFeed (or MockRouteFeed when FEED=mock)

frontend/src/api/types.ts        # UPDATE (additive): mirror destinationEnrichment on FlyOverResult

backend/src/tests/
├── unit/                        # UPDATE/ADD: openskyAuth, retry, flightRoutes mapping, airports,
│                                #      destinationCache, feeds (destinations), service enrichment
└── contract/                    # UPDATE: rest-fly-overs + mcp-planes-over parity with destinations
```

**Structure Decision**: The feature stays entirely inside the existing `backend` package plus one
additive line-parity type in the `frontend` package. The `AircraftFeed` abstraction (position
feed) is unchanged and a second, **independent** `FlightRouteFeed` abstraction is introduced so the
position source and the route/destination source are separately mockable and independently
rate-limited — matching the OpenSky credit-bucket model. Both are injected into the shared
`FlyOverService`, so REST and MCP remain parity-by-construction.

## Complexity Tracking

> None required — Constitution Check passed without violations.