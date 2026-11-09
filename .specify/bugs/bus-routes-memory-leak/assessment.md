# Bug Assessment: Bus-catcher never loads its schedule automatically and refresh can exhaust memory

- **Slug**: bus-routes-memory-leak
- **Created**: 2026-11-07
- **Source**: pasted text (no URL supplied — URL trust policy: N/A)
- **Verdict**: valid (route loading is proven in code; the OOM mechanism is strongly evidenced but the exact crash needs confirmation in the deployed environment)
- **Severity**: high

## Report (verbatim or summarized)

> the bus module is creating problems, the bus routes are not loaded on start or automatically and
> the module eventually runs out of memory, i think because we save too much data, is there a way for
> the backend to be more reliable?

No URL, stack trace, or OOM message was supplied. The report bundles two symptoms: (1) schedule
data (lines/stops/trips/stop_times) is not present when the backend starts, and (2) the module
eventually runs out of memory.

## Symptom

On a fresh database (or after a restart without a prior manual ingest) the bus-catcher API returns
empty line/stop/schedule results and only becomes usable after a human calls `POST /api/refresh` (or
runs the `ingest` CLI). Separately, the refresh path materializes the whole Carris Metropolitana GTFS
archive in memory and the process is eventually killed / errors with an out-of-memory condition.

Expected: the backend should become usable on its own (load a schedule at startup if the local
database is empty, and refresh it when stale), and ingestion should be memory-bounded enough to run
on a small always-on home host.

## Reproduction

1. Start with an empty database (`.specify`-independent evidence: the repo's current
   `data/bus-catcher.db` has **0 rows** in `lines`, `stops`, `trips`, `stop_times`, `calendar`,
   `calendar_dates`, and `metadata`).
2. Start the REST backend (`pnpm --filter ./modules/bus-catcher/backend dev`).
3. Request `GET /api/lines` and `GET /api/stops?q=a` → both are empty; `GET /api/status` reports the
   feed as stale/never refreshed.
4. Leave the process running or restart it → still empty; nothing in the startup path or a timer
   triggers ingestion.
5. Trigger `POST /api/refresh` and watch process memory. The worker decompresses the archive
   (~941 MB uncompressed; see evidence below), the main thread keeps the ~71 MB compressed buffer
   and posts a copy to the worker, and `trips.txt` (50 MB / 306,979 rows) is turned into in-memory
   strings and objects while `stop_times.txt` (794 MB / 9,955,082 rows) stays resident during the
   insert.
6. Repeat refreshes; because the feed hash is computed but never compared with the stored
   `feed_version`, every refresh re-downloads and re-ingests all ~10 M stop_times rows, repeating the
   peak. On a memory-constrained host/container this ends in an OOM kill.
7. [NEEDS CLARIFICATION: the exact OOM signal — container exit 137 / kernel OOM killer, Node
   `JavaScript heap out of memory`, or host disk exhaustion — and the host/container memory limit.]

## Suspected Code Paths

- `modules/bus-catcher/backend/src/index.ts:7-19` — the entrypoint only starts HTTP or MCP; it never
  schedules or triggers a feed refresh.
- `modules/bus-catcher/backend/src/compose.ts:20-38` — `createBackend()` only migrates the DB and
  wires services; `refresh` is created but never called.
- `modules/bus-catcher/backend/src/services/refresh.ts:57-102` — refresh runs only when an explicit
  caller invokes `refresh()`; there is no startup check, interval, or staleness policy here.
- `modules/bus-catcher/backend/src/http/app.ts:95-98`,
  `modules/bus-catcher/backend/src/mcp/index.ts:146-154`,
  `modules/bus-catcher/backend/src/cli/ingest.ts:9-29` — the only ingestion triggers are manual
  (`POST /api/refresh`, the MCP `refresh_schedule` tool, or the CLI).
- `modules/bus-catcher/backend/src/providers/carris-metropolitana/gtfs.ts:240-242` —
  `unzipGtfs()` calls `unzipSync(buffer)`, decompressing **every** entry into a single in-memory
  `Record<string, Uint8Array>`.
- `modules/bus-catcher/backend/src/providers/carris-metropolitana/gtfs.ts:402-408` —
  `downloadGtfs()` buffers the entire response (`arrayBuffer()`), with no timeout and no size guard.
- `modules/bus-catcher/backend/src/services/refresh.ts:65-69,88` — the full 71 MB buffer is
  downloaded on the main thread and `worker.postMessage({ dbPath, buffer, feedVersion })` is sent
  **without a transfer list**, so the worker receives a structured clone (another full copy).
- `modules/bus-catcher/backend/src/services/refresh-worker.ts:14-33` and
  `modules/bus-catcher/backend/src/providers/carris-metropolitana/ingest.ts:72-83` — the worker
  unzips everything, then `strFromU8` materializes `trips.txt` (50 MB) and `parseGtfsMeta()` /
  `parseCsvRows()` build all 306,979 trip rows as JS strings/objects before inserting.
- `modules/bus-catcher/backend/src/providers/carris-metropolitana/gtfs.ts:99-116,151-172,262-364` —
  `parseCsvRows()`/`parseTable()` split whole files into line arrays and row objects; there is no
  streaming path for `trips.txt`.
- `modules/bus-catcher/backend/src/providers/carris-metropolitana/ingest.ts:151-165` — stop_times is
  streamed in batches, but it is streamed from the fully decompressed 794 MB buffer that remains
  resident for the whole transaction.
- `modules/bus-catcher/backend/src/services/refresh.ts:66-67` + `ingest.ts:167-171` — the feed hash
  is computed and stored, but never read back to skip an unchanged feed, so every manual refresh
  repeats the full download and ~10 M-row rewrite.
- `modules/bus-catcher/backend/src/db/client.ts:30-38` and
  `modules/bus-catcher/backend/src/services/refresh-worker.ts:29` — the ingest connection disables
  auto-checkpoint and the `wal_checkpoint(TRUNCATE)` return value is ignored; a failed/partial
  checkpoint can leave a large WAL (the CHANGELOG documents a prior "orphaned multi-GB WAL").
- `modules/bus-catcher/backend/src/providers/carris-metropolitana/cache.ts:18-28` — the realtime
  cache is an unbounded `Map` that never evicts; a secondary, bounded-but-ever-growing memory
  contributor.
- `modules/bus-catcher/backend/src/providers/carris-metropolitana/queries.ts:231-258` — `nextTimes`
  loads every matching stop_time row and filters/slices in JS (polled every 15 s per configured
  stop), adding transient per-request memory pressure on busy stops.
- `modules/bus-catcher/backend/src/http/app.ts:42` and `docker-compose.yml:10-58` — the healthcheck
  only tests process liveness, so Compose reports the backend "healthy" with an empty schedule;
  moreover the REST and MCP containers both mount `./data` and both call `migrateDb` at boot /
  expose `refresh`, giving two writers to one SQLite file.

**Measured feed evidence** (fetched 2026-11-07 from `https://api.carrismetropolitana.pt/gtfs`, which
redirects to `/v2/gtfs`):

| File | Compressed zip | Uncompressed | Rows |
|------|----------------|--------------|------|
| `stop_times.txt` | (in 71 MB zip) | 794,450,369 B | 9,955,082 |
| `shapes.txt` (unused) | — | 92,452,650 B | — |
| `trips.txt` | — | 50,345,282 B | 306,979 |
| `stops.txt` | — | 3,640,410 B | 12,798 |
| `routes.txt` | — | 92,165 B | 947 |
| **total archive** | **71 MB** | **~941 MB** | — |

## Root Cause Hypothesis

**Confidence: high** for the missing autoload; **high** that the refresh design is memory-unbounded;
**medium** that this exact path is the OOM the reporter saw (pending the OOM signal/limits).

1. **No schedule lifecycle.** The backend migrates schema at boot but never checks whether schedule
   data exists and never triggers ingestion. Ingestion is only reachable through `POST /api/refresh`,
   the MCP tool, or the CLI. Therefore a fresh volume stays empty forever unless someone presses
   Refresh. This is a code-level proof, not a hypothesis.
2. **Refresh performs a full in-memory expansion of a ~941 MB archive.** `unzipSync` decompresses all
   nine entries at once, including the unused 92 MB `shapes.txt`; the 71 MB compressed buffer is also
   cloned into the worker because no transfer list is used; `trips.txt` is materialized as a 50 MB
   string plus ~307 k row objects; and the 794 MB decompressed `stop_times.txt` buffer stays resident
   while ~10 M rows are inserted. Peak RSS is therefore well above 1–2 GB per refresh. On a typical
   home server/NAS or a container with a 1–2 GB limit, the process is OOM-killed. Because the
   computed feed hash is never compared to the stored one, every manual refresh repeats the peak and
   the ~10 M-row rewrite instead of being a cheap no-op.
3. **Secondary pressure.** The ingest WAL can grow to the size of the rewrite if the checkpoint is
   not successful, and the realtime cache never evicts. These are less likely to be the primary OOM
   but compound it over time.

## Proposed Remediation

**Preferred**: split the fix into "lifecycle" and "memory-bounded ingest".

*Lifecycle (makes the backend reliable without manual clicks):*
- Add an `ensureFreshSchedule()` step after `createBackend()` in `src/index.ts`: if the schedule
  tables are empty (or `metadata.last_refresh` is missing / older than a TTL, e.g. 24 h), call the
  existing single-flight `refresh.refresh()` asynchronously so `/api/health` still answers while the
  feed loads. Add a periodic timer (e.g. every 6–24 h) with backoff on failure, and surface the
  state in `/api/status` (`never_loaded` / `refreshing` / `ready` / `error`) rather than only
  `refreshing: boolean`. Optionally let the SPA show a "loading schedule" state instead of an empty
  dashboard.
- Give ingestion a single owner. Either let the REST backend own refresh and make the MCP process
  read-only, or take a cross-process lock (e.g. a `metadata` claim row with an owner + expiry, or an
  OS file lock). This avoids two containers racing `migrateDb`/ingest on the same SQLite file.
- Add a readiness signal (or extend the healthcheck) that reflects "schedule loaded", so Compose
  `depends_on` and the SPA do not treat an empty DB as ready.

*Memory-bounded ingest:*
- Download the archive to a temp file (with `AbortSignal.timeout` and a maximum size / content-length
  check) and stream-unzip only the needed entries (fflate's streaming `Unzip` API or an equivalent),
  skipping `shapes.txt` and any other unused file. Never hold all entries at once.
- Pass the temp-file path to the worker (or transfer the buffer: `postMessage(msg, [buffer.buffer])`)
  so the archive is not cloned again.
- Stream `trips.txt` into SQLite the same way `stop_times.txt` is streamed today; avoid
  `strFromU8` + `split` + full row-object arrays for 307 k trips.
- Skip re-ingest when the downloaded feed version equals `metadata.feed_version` (and add a
  `force` flag for manual refreshes). Prefer `ETag`/`Last-Modified`/`HEAD` to avoid even downloading
  an unchanged 71 MB feed.
- After ingest, check the `wal_checkpoint(TRUNCATE)` result and log/retry if it is busy; consider a
  sane `wal_autocheckpoint` and a documented one-time `VACUUM`/WAL cleanup for already-bloated DBs.
- Bound the realtime cache (LRU or TTL eviction) and, for `nextTimes`, push the "next N" filtering
  into SQL to avoid loading every row for a stop on each 15 s poll.

**Alternatives** (optional):
- **Run ingestion as a separate one-shot job**: an entrypoint/Compose `ingest` service (and cron)
  owns download + ingest; REST/MCP are read-only. Trade-off: more orchestration, but the heavy
  process can be memory-limited and killed without taking down the API, and there is one writer.
- **Ship/consume a prebuilt SQLite snapshot** instead of ingesting in-process. Trade-off: larger
  image or external artifact and staleness management, but minimal runtime memory.
- **Mitigate only**: add container memory limits and `--max-old-space-size`. Trade-off: turns OOM
  into a predictable kill; does not fix the ~941 MB expansion.

**Files likely to change**:
- `modules/bus-catcher/backend/src/index.ts`
- `modules/bus-catcher/backend/src/compose.ts`
- `modules/bus-catcher/backend/src/services/refresh.ts`
- `modules/bus-catcher/backend/src/services/refresh-worker.ts`
- `modules/bus-catcher/backend/src/providers/carris-metropolitana/gtfs.ts`
- `modules/bus-catcher/backend/src/providers/carris-metropolitana/ingest.ts`
- `modules/bus-catcher/backend/src/db/client.ts`
- `modules/bus-catcher/backend/src/providers/carris-metropolitana/cache.ts` (optional LRU)
- `modules/bus-catcher/backend/src/providers/carris-metropolitana/queries.ts` (optional SQL limit)
- `modules/bus-catcher/backend/src/http/app.ts` / `modules/bus-catcher/backend/src/mcp/index.ts`
  (status states, `force` flag)
- `docker-compose.yml`, `modules/bus-catcher/Dockerfile.backend` (single writer, readiness, limits)
- `modules/bus-catcher/frontend/src/pages/Dashboard.tsx`,
  `modules/bus-catcher/frontend/src/api/queries.ts` (loading/empty/failure states)

**Tests to add or update**:
- Booting with an empty DB triggers exactly one refresh (mock download) and subsequently serves
  lines/stops; booting with a fresh `last_refresh` does not download.
- Stale/missing `last_refresh` triggers the periodic path; failures retry with backoff and are
  exposed via `/api/status` (not just logs).
- An unchanged feed version skips ingestion; a changed version ingests; `force` always ingests.
- Ingest of a large stop_times fixture stays within bounded batches and does not retain the whole
  decompressed archive; verify `shapes.txt` is never decompressed.
- Two processes (REST + MCP) starting together do not race migrations or ingest (cross-process
  lock/ownership test).
- `wal_checkpoint(TRUNCATE)` success/failure is observed and WAL does not grow across refreshes.
- Download timeout/oversize response fails cleanly and releases the single-flight lock.
- Realtime cache eviction (if changed) and `nextTimes` still returns the correct next N.

## Risks & Considerations

- **Atomicity must be preserved**: the ingest replaces tables inside one transaction and deliberately
  disables FK enforcement so configured stops survive; a streaming rewrite can easily regress this.
  Keep the existing replace-preserve-config tests and add failure/rollback coverage.
- **Crash-loop refresh storms**: auto-refresh on boot plus a crash-looping container can repeatedly
  download/ingest. Persist attempt timestamps and back off; do not let the timer fire concurrently
  with the single-flight lock.
- **Startup UX**: async boot ingest means the API is reachable but empty for a while; expose a clear
  `loading`/`never_loaded` status and decide whether search should return an explicit "schedule
  loading" response instead of an empty list.
- **Two writers**: SQLite WAL allows one writer; REST and MCP containers sharing `./data` can
  collide on `migrateDb` and refresh. The fix must define a single ingester (or a cross-process lock).
- **Disk footprint**: even after streaming, the DB will hold ~10 M stop_times rows (hundreds of MB
  to >1 GB with indexes). Confirm the host has disk headroom and decide whether to prune expired
  service days/`stop_times`.
- **Feed-change detection**: content-hash skipping still requires downloading 71 MB; ETag/HEAD checks
  are preferable. Confirm the upstream supports them.
- **API/observability**: adding status states is additive, but the frontend and MCP contract must be
  updated together (dual-mode parity). Add ingest duration, row counts, peak/current RSS, DB and WAL
  size to logs.
- **No schema change is required** for the core fix; existing bloated DB/WAL files may need a
  one-time checkpoint/VACUUM.

## Open Questions

- [NEEDS CLARIFICATION: What is the exact OOM signal and where is it observed — kernel/Docker OOM
  kill (exit 137), Node heap `JavaScript heap out of memory`, or host disk full? What are the host
  and container memory/disk limits?]
- [NEEDS CLARIFICATION: Does the failing deployment run both `bus-catcher-backend` and
  `bus-catcher-mcp` against the same `./data` volume (Compose profiles `full`/`backend`)? If so, are
  both triggering refreshes?]
- [NEEDS CLARIFICATION: What freshness policy is desired — load only when the DB is empty, refresh at
  startup when stale, and/or a daily scheduled refresh? How long may data be stale?]
- [NEEDS CLARIFICATION: Is a "skip when the feed is unchanged" behavior acceptable, or must a manual
  refresh always re-ingest? Should there be a `force` option?]
- [NEEDS CLARIFICATION: Is a multi-hundred-MB/1 GB database acceptable on the target host, or should
  expired service days / old stop_times be pruned?]
- [NEEDS CLARIFICATION: Is it acceptable for the first startup to serve an empty/loading schedule
  while ingestion runs in the background, or should startup block until the feed is loaded?]
