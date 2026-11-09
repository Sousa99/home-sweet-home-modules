# Bug Verification: Bus-catcher auto-loads its schedule and ingests with bounded memory

- **Slug**: bus-routes-memory-leak
- **Tested**: 2026-11-09
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

The original symptom is gone: a REST backend started against a brand-new empty database loaded the
schedule on its own (2 lines searchable 1 s after boot) without any manual `POST /api/refresh`, and
`/api/status` reported a non-null `lastRefresh`. The fix's unit/integration tests, the full backend
and frontend suites, lint, type-check, and the backend build all pass. The real 71 MB feed was
previously re-ingested during the fix at ~759 MB peak RSS (down from ~4.5 GB); that network- and
disk-heavy measurement was not repeated here.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) | Boot `node --import tsx src/index.ts --http` with a fresh temp `DB_PATH` and a local fixture `GTFS_URL`; poll `/api/lines`, `/api/stops`, `/api/status` | pass | 2 lines loaded in ~1 s with no manual refresh; `/api/stops?q=Paragem` returned 2 stops; `lastRefresh` set, `stale:false`, `refreshError:null`. |
| New / updated tests | `pnpm --filter ./modules/bus-catcher/backend test` | pass | 13 files / **159 tests** passed, including `lifecycle.test.ts` (5), `refresh.test.ts` (7), `ingest.test.ts` (2), `gtfs.test.ts` (7), `app.test.ts` (31). |
| Regression suite — backend | same command as above | pass | All pre-existing backend suites green (`schedule`, `queries`, `config`, `realtime`, `cache`, `schemas`, `time`, `http/app`). |
| Regression suite — frontend | `pnpm --filter ./modules/bus-catcher/frontend test` | pass | 10 files / **84 tests** passed (only an optional `refreshError` type was added). |
| Lint / type-check — backend | `pnpm --filter ./modules/bus-catcher/backend typecheck`; `pnpm --filter ./modules/bus-catcher/backend exec eslint src` | pass | `tsc --noEmit` clean; ESLint no output. |
| Lint / type-check — frontend | `pnpm --filter ./modules/bus-catcher/frontend typecheck` | pass | Clean. |
| Formatting | `pnpm exec prettier --check "modules/bus-catcher/backend/src/**/*.ts" ...` | pass | All matched files use Prettier style. |
| Build | `pnpm --filter ./modules/bus-catcher/backend build` | pass | `dist/index.js`, `dist/migrate.js`, `dist/refresh-worker.js` emitted. |
| Compose wiring | `docker compose config >/dev/null` | pass | New `SCHEDULE_*` env vars resolve correctly. |
| Real-feed memory bound | Real 74.5 MB GTFS ingest into a throwaway DB (done during the fix, see `fix.md`) | skipped (network/expensive) | Measured 9,892,132 stop_times + 306,978 trips in ~34 s at ~759 MB peak RSS; not repeated to avoid another 71 MB download and ~1.7 GB temp DB. |
| Unchanged-feed skip | `refresh.test.ts::skips re-ingest when the upstream feed version is unchanged` | pass | Second refresh reported `up_to_date`, `runIngest` call count stayed at 1; `force` made it 2. |
| Cross-process lock | `refresh.test.ts::reports in_progress when another process holds the refresh lock` | pass | A held lock file yields `in_progress` without downloading. |

## Output Excerpts

Post-fix reproduction (fresh DB, no manual refresh):

```text
lines_loaded=2 elapsed_s=1
--- /api/stops?q=Paragem
['Paragem E2E', 'Segunda Paragem']
--- /api/status
{"lastRefresh":"2026-11-09T19:05:19.063Z","feedVersion":"eab91dde9eb9","stale":false,
 "refreshing":false,"refreshError":null,...}
--- server log
{"message":"schedule auto-refresh","reason":"never_loaded","status":"started"}
{"message":"ingest complete","lines":2,"stops":2,"trips":2,"stopTimes":3,"elapsedMs":5}
```

Backend suite:

```text
Test Files  13 passed (13)
     Tests  159 passed (159)
```

Frontend suite:

```text
Test Files  10 passed (10)
     Tests  84 passed (84)
```

Real-feed ingest measured during the fix:

```text
ingest complete lines=946 stops=12797 trips=306978 stopTimes=9892132 elapsedMs≈34000
peak_rss_mb=759
```

## Residual Risks

- **Reporter's environment not reproduced.** The OOM was verified as a memory-bound design problem
  and measured on a real feed, but the original host/container memory limit and OOM signal are still
  `[NEEDS CLARIFICATION]`. A host with a very small limit (< 1 GB) could still be tight during a
  first ingest.
- **Disk footprint remains large.** The current upstream feed produces a ~1.7 GB SQLite file. If the
  reporter's "out of memory" was actually disk exhaustion, pruning expired service days / old
  `stop_times` and a one-time `VACUUM` are still follow-ups.
- **Unchanged-feed check still downloads the archive** before comparing its hash; an
  `ETag`/`Last-Modified`/`HEAD` short-circuit is deferred.
- **MCP-only deployments do not auto-load.** Ingestion is owned by the REST process; an MCP-only
  stack must trigger `refresh_schedule` or run the REST backend.
- **Boot migrations in two processes** (REST + MCP sharing one DB) are not serialized by the new
  refresh lock; this is unchanged behavior and listed as a follow-up.
- **Container image E2E not run.** The reproduction used the source entrypoint under `tsx`; the
  built worker bundle was verified by the successful build and the Dockerfile's `/drizzle` layout is
  unchanged.

## Recommendation

Close the bug — verified end-to-end for the reported autoload symptom, with the memory regression
covered by the new streaming ingest, unchanged-feed skip, and the measured ~759 MB peak on the real
feed. Track the disk-footprint/pruning, `ETag` short-circuit, and readiness/health follow-ups in a
separate change if the reporter's OOM turns out to have been disk-related.
