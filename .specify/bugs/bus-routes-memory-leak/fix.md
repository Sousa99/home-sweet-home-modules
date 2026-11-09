# Bug Fix: Bus-catcher now loads its schedule automatically and ingests it with bounded memory

- **Slug**: bus-routes-memory-leak
- **Fixed**: 2026-11-07
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

The REST backend now loads the GTFS schedule on boot when the database is empty and re-checks it
periodically, while the refresh path streams the ~71 MB archive instead of decompressing ~941 MB
into memory. An unchanged upstream feed is no longer re-ingested, a crash-safe lock keeps the REST
and MCP processes from ingesting into the same SQLite file concurrently, and the download gained a
timeout/size cap. On a real Carris Metropolitana feed the ingest completed in ~34 s with a peak RSS
of ~759 MB (down from ~4.5 GB observed with per-batch statement preparation).

## Changes

| File | Change | Notes |
|------|--------|-------|
| `modules/bus-catcher/backend/src/index.ts` | modified | Starts the schedule lifecycle in `--http` mode (single ingester); MCP stays read-only for ingestion. |
| `modules/bus-catcher/backend/src/config.ts` | modified | Adds `SCHEDULE_AUTO_REFRESH` (default true) and `SCHEDULE_CHECK_INTERVAL_MS` (default 15 min, validated). |
| `modules/bus-catcher/backend/src/services/lifecycle.ts` | added | Boot + periodic staleness check; calls the single-flight refresh. |
| `modules/bus-catcher/backend/src/services/refresh.ts` | modified | `force` option, feed-version skip, cross-process lockfile + heartbeat, buffer transfer, `lastError`/`lastOutcome`. |
| `modules/bus-catcher/backend/src/services/refresh-worker.ts` | modified | Uses the streaming ingest; logs a busy WAL checkpoint instead of silently ignoring it. |
| `modules/bus-catcher/backend/src/providers/carris-metropolitana/gtfs.ts` | modified | Incremental CSV reader across chunks; `parseTripRow`; download timeout/size guard; metadata parser can skip trips. |
| `modules/bus-catcher/backend/src/providers/carris-metropolitana/ingest.ts` | modified | Replaced `unzipSync` with streaming `Unzip` (1 MB chunks), streams trips + stop_times, skips unused `shapes.txt`, reuses prepared statements, caps warnings. |
| `modules/bus-catcher/backend/src/cli/ingest.ts` | modified | Uses the streaming ingest path. |
| `modules/bus-catcher/backend/src/http/app.ts` | modified | `POST /api/refresh?force=true`. |
| `modules/bus-catcher/backend/src/mcp/index.ts` | modified | `refresh_schedule` accepts `force`. |
| `modules/bus-catcher/backend/src/services/schedule.ts` | modified | Exposes `refreshError` in status. |
| `modules/bus-catcher/backend/src/lib/schemas.ts` | modified | Adds optional `refreshError` to the status contract. |
| `modules/bus-catcher/frontend/src/api/types.ts` | modified | Mirrors the optional `refreshError` field. |
| `modules/bus-catcher/backend/src/services/lifecycle.test.ts` | added test | Boot/interval/stale/fresh/busy/error behavior. |
| `modules/bus-catcher/backend/src/services/refresh.test.ts` | added tests | Unchanged-feed skip, `force`, cross-process lock, `lastError`. |
| `modules/bus-catcher/backend/src/providers/carris-metropolitana/ingest.test.ts` | added test | Streaming ingest and atomic replacement against a migrated DB. |
| `modules/bus-catcher/backend/src/providers/carris-metropolitana/gtfs.test.ts` | added test | CSV rows/multi-byte characters split across chunks. |
| `modules/bus-catcher/backend/src/http/app.test.ts` | modified | Updated the `RefreshService` stub for the new methods. |
| `modules/bus-catcher/setup.md` | modified | Documents auto-loading, `?force=true`, and the two new env vars. |
| `modules/bus-catcher/README.md` | modified | Feed-lifecycle description matches the new behavior. |
| `docker-compose.yml` | modified | Forwards the two schedule env vars to the REST backend service. |
| `.env.example` | modified | Documents `HSH_BUS_CATCHER_AUTO_REFRESH` / `HSH_BUS_CATCHER_CHECK_INTERVAL_MS`. |

## Diff Highlights (optional)

Boot loading (REST owns ingestion):

```ts
if (mode === 'http') {
  if (config.scheduleAutoRefresh) {
    createScheduleLifecycle({
      getStatus: () => backend.provider.getStatus(),
      refresh: backend.refresh,
      intervalMs: config.scheduleCheckIntervalMs,
    }).start();
  }
  startHttpServer(backend);
}
```

Skip unchanged feeds and avoid the worker copy:

```ts
const existing = getCurrentFeedVersion();
if (!refreshOptions.force && existing !== null && existing === feedVersion) {
  updateLastRefresh(new Date().toISOString());
  lastResult = 'up_to_date';
  return;
}
await runIngest({ dbPath, buffer: toTransferable(buffer), feedVersion });
```

Memory-bounded archive read (only needed entries are decompressed):

```ts
unzip.onfile = (file) => {
  if (!NEEDED_FILES.has(file.name)) return; // never decompress shapes.txt
  // trips.txt / stop_times.txt are parsed row-by-row into bounded batches
};
for (let offset = 0; offset < archive.length; offset += PUSH_CHUNK) {
  unzip.push(archive.subarray(offset, end), end === archive.length);
}
```

Prepared statements are cached by SQL shape; preparing one per 500-row batch was the dominant
memory churn (see the manual measurement below).

## Tests Added or Updated

- `services/lifecycle.test.ts::triggers a refresh when the database has never been loaded` — fresh volumes self-load.
- `services/lifecycle.test.ts::triggers a refresh when the schedule is stale` / `does not refresh a fresh schedule or one already refreshing`.
- `services/lifecycle.test.ts::checks on start, then on the interval, and stops cleanly` — timer lifecycle.
- `services/lifecycle.test.ts::logs and swallows status errors` — a broken DB read cannot crash the process.
- `services/refresh.test.ts::skips re-ingest when the upstream feed version is unchanged` — no repeated 10 M-row rewrite; `force` bypasses it.
- `services/refresh.test.ts::reports in_progress when another process holds the refresh lock` — REST/MCP cannot ingest concurrently.
- `services/refresh.test.ts` (existing) — also asserts `lastError` is surfaced and cleared after a retry.
- `providers/carris-metropolitana/ingest.test.ts::streams trips/stop_times and stores the metadata tables` — the new path populates a real migrated schema.
- `providers/carris-metropolitana/ingest.test.ts::atomically replaces the previous schedule`.
- `providers/carris-metropolitana/gtfs.test.ts::reassembles rows and multi-byte characters split across chunks` — the incremental reader handles arbitrary chunk boundaries.
- `http/app.test.ts` — existing REST contract tests still pass with the extended refresh service.

## Local Verification

- Commands run: `pnpm --filter ./modules/bus-catcher/backend typecheck` → pass.
- `pnpm --filter ./modules/bus-catcher/backend test` → 13 files / 159 tests pass.
- `pnpm --filter ./modules/bus-catcher/backend exec eslint src` → pass (no output).
- `pnpm exec prettier --check "modules/bus-catcher/backend/src/**/*.ts" ...` → all formatted.
- `pnpm --filter ./modules/bus-catcher/backend build` → `dist/index.js`, `dist/migrate.js`, `dist/refresh-worker.js` built.
- `pnpm --filter ./modules/bus-catcher/frontend typecheck` → pass.
- `pnpm --filter ./modules/bus-catcher/frontend test` → 10 files / 84 tests pass.

- Manual checks: ingested the real Carris Metropolitana feed (74,528,158 B download) into a
  throwaway database with the new streaming path:
  - Stored 946 lines, 12,797 stops, 306,978 trips, 9,892,132 stop_times in ~34 s.
  - Peak RSS ~759 MB (sampled every 500 ms with `ps`); an intermediate streaming build that
    prepared a statement per batch peaked at ~4.0–4.5 GB, which is why the statement cache was
    added.
  - The resulting SQLite file was ~1.7 GB and the final `wal_checkpoint(TRUNCATE)` left no WAL.
  - Temp DB/ZIP artifacts were deleted after the check.

## Deviations from Assessment

- **Single writer**: auto-refresh starts only in the REST (`--http`) process. The assessment offered
  this as the alternative to a cross-process lock; the MCP process can still trigger `refresh_schedule`
  manually, and the new lockfile prevents concurrent ingests if both are triggered.
- **Lock mechanism**: used a lockfile next to the database with a 5-minute stale window and a 30 s
  heartbeat, rather than a `metadata` claim row. Same single-writer effect, no schema change.
- **Feed-change detection still downloads the archive** because the hash is computed from its
  bytes; an `ETag`/`Last-Modified`/`HEAD` short-circuit is listed as a follow-up.
- **Scope expanded** beyond the assessment's file list to add the lifecycle service, the streaming
  CSV reader, config/schema/frontend type fields, tests, the two documentation files, and
  `.env.example`. The assessment's `compose.ts` and `Dockerfile` entries were not needed for this
  change (the Docker image already runs `dist/index.js`, which now starts the lifecycle).
- Deferred (not required to fix the reported symptoms): readiness/"schedule loaded" health state,
  dashboard rendering of `refreshError`, a one-time `VACUUM`/pruning policy for the ~1.7 GB DB,
  pushing `nextTimes` limits into SQL, and evicting the realtime cache.

## Follow-ups

- Use `ETag`/`Last-Modified` (or a `HEAD` request) to skip even the 71 MB download when the upstream
  feed is unchanged.
- Surface `refreshError` and a "loading schedule" state in the Dashboard; extend the Compose
  healthcheck to report whether the schedule is loaded (not just that the process is alive).
- Decide whether to prune expired service days / old `stop_times`, and document a one-time
  `VACUUM`/`wal_checkpoint` for existing oversized databases.
- Bound the realtime cache (LRU/TTL eviction) and push the "next N" filtering into SQL.
- Add a pre-PR changeset for the fixed group (`@sousa99/bus-catcher-backend` +
  `@sousa99/bus-catcher-components`) per the repository release convention.
