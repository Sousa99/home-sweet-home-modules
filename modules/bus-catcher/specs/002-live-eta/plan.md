# Implementation Plan: Live ETA

**Branch**: `feature/002-live-eta` | **Date**: 2026-09-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-live-eta/spec.md`

## Summary

Adds live ETA to the existing dashboard: for each configured stop, the
dashboard shows the next buses with a **Live** prediction where the Carris
Metropolitana realtime feed provides one, and the scheduled time otherwise —
with the live/scheduled distinction always visible (per-row marker + delay
delta + per-stop coverage notice). Live predictions are fetched from the CM
API v2 `GET /arrivals/by_stop/:id` endpoint, merged onto the existing
scheduled passings by `(trip_id, stop_id)`, cached in memory (~15 s), and
governed by a realtime staleness budget that demotes stale predictions to
"schedule" (constitution II). Builds on the 001 provider seam: `Passing`
gains optional, backward-compatible fields; the dashboard component is
extended, not rewritten (spec FR-010 / 001 SC-005).

## Technical Context

**Language/Version**: Node 24, TypeScript (strict; shared presets).

**Primary Dependencies**: no new runtime deps — fetch (Node 24 built-in) +
existing stack (Hono, zod, drizzle/better-sqlite3, TanStack Query v5, Tailwind).

**Storage**: unchanged SQLite schema; only new `metadata` keys
(`realtime_last_fetch`); live arrivals cached in-memory (TTL).

**Testing**: Vitest — TDD (constitution IV) with dedicated tests for: CM
arrivals parsing, realtime staleness/demotion logic, merge of live onto
schedule, delay math, enriched route/tool contracts, and frontend components
(Live/Schedule badges, delay delta, coverage notice).

**Target Platform**: Linux/Node server; evergreen browsers (Home Sweet Home
dashboard).

**Performance Goals**: dashboard render < 2 s (unchanged); per-stop realtime
merge < 50 ms beyond the existing query (indexed + in-memory cache);
realtime feed polled at most ~once per stop per 15 s.

**Constraints**: REST and MCP MUST share one service layer; one home user;
realtime MUST be a provider behind the abstraction seam; live predictions
older than the staleness budget MUST be demoted to scheduled, never shown as
live; schedule-only fallback must never error (constitution II, FR-004/007).

**Scale/Scope**: ~2,300 stops; one dashboard user; partial realtime coverage
by nature.

## Constitution Check

*GATE: must pass before implementation.*

- **II Freshness-Aware Realtime**: `source` + `predictedAt` carry
  per-prediction timestamps; `REALTIME_STALE_AFTER_MS` demotes stale
  predictions to scheduled (FR-005); per-stop and global realtime freshness
  surfaced in `times`/`status` (FR-010). ✅
- **III Provider Abstraction**: `LiveEtaProvider` behind the existing
  `ScheduleProvider` seam (`backend/src/providers/types.ts`); the CM realtime
  adaptor is self-contained and unit-tested; app contract gains optional
  fields only (FR-008). ✅
- **IV Test-First (NON-NEGOTIABLE)**: tests for arrivals parsing, staleness
  demotion, merge/delay math, route/tool contracts, and frontend badge/notice
  components written and confirmed failing before implementation. ✅
- **V Observability & Correct Time Handling**: structured logs on realtime
  fetch/cache decisions/failures; UTC canonical + Europe/Lisbon display; DST
  handled via existing time lib; delays computed from absolute epochs. ✅
- **Data & Integration Constraints**: zod-validated arrivals (skip + warn,
  never crash); in-memory TTL cache + per-stop single-flight (respect rate
  limits); failure isolation (degraded → schedule-only, never fatal); REST/MCP
  share the same service layer; no PII. ✅
- **Quality gates**: `pnpm lint`, `pnpm format`, `pnpm test`,
  `pnpm typecheck`, `node scripts/scaffold.mjs --check` all pass before merge. ✅
- **Complexity**: the merge layer and TTL cache are constitution mandates
  (II/III) and required by the user's "difference must be visible" — not
  unjustified. No gate violations.

## Project Structure

### Documentation (this feature)

```text
specs/002-live-eta/
├── plan.md              # This file
├── research.md          # Realtime source + merge/staleness decisions
├── data-model.md        # Entities (Passing evolution, LivePrediction)
├── quickstart.md        # Run guide
├── contracts/           # Enriched REST + MCP contracts
│   ├── rest-api.md
│   └── mcp-tools.md
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # (/speckit.tasks output)
```

### Source Code (repository root)

```text
backend/src/
├── config.ts                     # + realtimeUrl, realtimeTtlMs, realtimeStaleAfterMs
├── lib/schemas.ts                # Passing + source/predictedAt/delayMinutes;
│                                 #   StopTimesResponse { times, realtime }; Status + realtime fields
├── providers/types.ts            # + LiveEtaProvider interface (getStopArrivals)
├── providers/carris-metropolitana/
│   ├── realtime.ts               # NEW: fetch + parse /arrivals/by_stop/:id (zod)
│   ├── cache.ts                  # NEW: in-memory TTL cache + per-stop single-flight
│   └── index.ts                  # ScheduleProvider gains LiveEtaProvider impl
├── services/
│   ├── schedule.ts               # merge live predictions onto passings (demotion, delay)
│   └── status.ts                 # (or extend schedule) realtime freshness for /api/status
├── http/app.ts                   # /api/stops/:id/times + /api/status use new payloads
└── mcp/index.ts                  # get_stop_times / get_status return enriched payloads

frontend/src/
├── api/types.ts                  # Passing + source/predictedAt/delayMinutes; RealtimeInfo; Status+
├── api/queries.ts                # useStopTimes typed to enriched payload (+ realtime block)
├── lib/time.ts                   # + formatDelay(delayMinutes)
├── components/StopTimesList.tsx  # per-row Live/Schedule marker, predicted time, delay delta
├── components/StopCoverage.tsx   # NEW: per-stop live coverage notice
└── pages/Dashboard.tsx           # coverage notice + realtime status banner
```

## Complexity Tracking

No constitution violations to justify. The merge service and TTL cache are
mandated by constitution II (stale data never shown as live) and III
(provider abstraction), and directly serve the user requirement that the
live/scheduled difference be visible. No new storage layer beyond an
in-memory cache and two `metadata` keys.