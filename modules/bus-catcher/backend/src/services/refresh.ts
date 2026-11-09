import { createHash } from 'node:crypto';
import { closeSync, mkdirSync, openSync, statSync, unlinkSync, utimesSync } from 'node:fs';
import { dirname } from 'node:path';
import { Worker } from 'node:worker_threads';
import { config } from '../config';
import { openDb } from '../db/client';
import { migrateDb } from '../db/migrate';
import { logger } from '../lib/logger';
import { downloadGtfs } from '../providers/carris-metropolitana/gtfs';
import { getMetadata, setMetadata } from '../providers/carris-metropolitana/queries';

export type RefreshStatus = 'started' | 'in_progress' | 'up_to_date';

export interface RefreshOptions {
  /** Re-ingest even when the downloaded feed matches the stored feed version. */
  force?: boolean;
}

export interface RefreshIngestInput {
  dbPath: string;
  buffer: Uint8Array;
  feedVersion: string;
}

export interface RefreshService {
  refresh(options?: RefreshOptions): { status: RefreshStatus };
  isRefreshing(): boolean;
  whenIdle(): Promise<void>;
  /** Message from the most recent failed refresh, or null. */
  lastError(): string | null;
  /** Outcome of the most recently completed refresh (null before the first run). */
  lastOutcome(): RefreshStatus | null;
}

export interface RefreshServiceOptions {
  dbPath: string;
  feedUrl?: string;
  download?: (url: string) => Promise<Uint8Array>;
  feedVersionOf?: (buffer: Uint8Array) => string;
  /** Defaults to reading `metadata.feed_version` from the local database. */
  getCurrentFeedVersion?: () => string | null;
  /** Defaults to spawning the refresh worker. Inject for tests. */
  runIngest?: (input: RefreshIngestInput) => Promise<void>;
  /** Defaults to writing `metadata.last_refresh`; inject for tests. */
  updateLastRefresh?: (value: string) => void;
}

// A live ingest heartbeats the lock every 30 s; a crashed process is
// reclaimable after this window (an ingest normally takes well under a minute).
const LOCK_STALE_MS = 5 * 60 * 1000;
const LOCK_HEARTBEAT_MS = 30 * 1000;

function sha256Prefix(buffer: Uint8Array): string {
  return createHash('sha256').update(buffer).digest('hex').slice(0, 12);
}

function readFeedVersion(dbPath: string): string | null {
  const { sqlite, db } = openDb(dbPath);
  try {
    return getMetadata(db, 'feed_version');
  } finally {
    sqlite.close();
  }
}

function writeLastRefresh(dbPath: string, value: string): void {
  const { sqlite, db } = openDb(dbPath);
  try {
    setMetadata(db, 'last_refresh', value);
  } finally {
    sqlite.close();
  }
}

/**
 * Cross-process single-flight guard. The in-process `running` flag only
 * protects one process; the REST and MCP containers share the same SQLite
 * file, so a lockfile next to the database keeps them from ingesting
 * concurrently. A stale lock (crashed process) is reclaimed after an hour.
 */
function acquireRefreshLock(dbPath: string): number | null {
  mkdirSync(dirname(dbPath), { recursive: true });
  const lockPath = `${dbPath}.refresh.lock`;
  try {
    return openSync(lockPath, 'wx');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
  }
  try {
    const info = statSync(lockPath);
    if (Date.now() - info.mtimeMs > LOCK_STALE_MS) {
      unlinkSync(lockPath);
      return openSync(lockPath, 'wx');
    }
  } catch {
    // Lock vanished or could not be reclaimed — report busy rather than racing.
  }
  return null;
}

function releaseRefreshLock(dbPath: string, fd: number): void {
  try {
    closeSync(fd);
  } finally {
    try {
      unlinkSync(`${dbPath}.refresh.lock`);
    } catch {
      // Already removed (or unreachable) — nothing to do.
    }
  }
}

/**
 * Worker entry path: the built bundle lives next to dist/index.js; in dev the
 * source file is loaded directly under the tsx loader (which resolves the
 * project's extensionless imports).
 */
function workerOptions() {
  if (import.meta.url.includes('/dist/')) {
    return {
      url: new URL('./refresh-worker.js', import.meta.url),
      execArgv: undefined as string[] | undefined,
    };
  }
  return {
    url: new URL('./refresh-worker.ts', import.meta.url),
    execArgv: ['--import', 'tsx'],
  };
}

async function runRefreshWorker(input: RefreshIngestInput): Promise<void> {
  const { url, execArgv } = workerOptions();
  await new Promise<void>((resolve, reject) => {
    const worker = new Worker(url, execArgv ? { execArgv } : undefined);
    let settled = false;
    worker.once('message', (message: { ok: boolean; error?: string }) => {
      settled = true;
      void worker.terminate();
      if (message.ok) resolve();
      else reject(new Error(message.error ?? 'refresh failed'));
    });
    worker.once('error', (err) => {
      if (settled) return;
      settled = true;
      void worker.terminate();
      reject(err);
    });
    worker.once('exit', (code) => {
      if (settled) return;
      settled = true;
      reject(new Error(`refresh worker exited with code ${code}`));
    });
    // Transfer ownership instead of structured-cloning the ~70 MB archive.
    worker.postMessage(
      { dbPath: input.dbPath, buffer: input.buffer, feedVersion: input.feedVersion },
      [input.buffer.buffer as ArrayBuffer],
    );
  });
}

function toTransferable(buffer: Uint8Array): Uint8Array {
  if (buffer.byteOffset === 0 && buffer.byteLength === buffer.buffer.byteLength) {
    return buffer;
  }
  return buffer.slice();
}

export function createRefreshService(options: RefreshServiceOptions): RefreshService {
  const {
    dbPath,
    feedUrl = config.feedUrl,
    download = downloadGtfs,
    feedVersionOf = sha256Prefix,
    getCurrentFeedVersion = () => readFeedVersion(dbPath),
    runIngest = runRefreshWorker,
    updateLastRefresh = (value) => writeLastRefresh(dbPath, value),
  } = options;

  let running = false;
  let current: Promise<void> | null = null;
  let lastErrorMessage: string | null = null;
  let lastResult: RefreshStatus | null = null;

  return {
    refresh(refreshOptions = {}) {
      if (running) return { status: 'in_progress' };
      const lock = acquireRefreshLock(dbPath);
      if (lock === null) return { status: 'in_progress' };

      running = true;
      lastErrorMessage = null;
      const lockPath = `${dbPath}.refresh.lock`;
      const heartbeat = setInterval(() => {
        try {
          utimesSync(lockPath, new Date(), new Date());
        } catch {
          // Lock removed/replaced — the next refresh attempt will re-acquire.
        }
      }, LOCK_HEARTBEAT_MS);
      heartbeat.unref?.();
      current = (async () => {
        try {
          // Ensure the schema exists on the main thread before the worker
          // ingests. Migrating here is sequential and idempotent (never
          // concurrent with the server's own boot migrate), so the worker
          // itself must not migrate.
          migrateDb(dbPath);
          const buffer = await download(feedUrl);
          const feedVersion = feedVersionOf(buffer);
          const existing = getCurrentFeedVersion();

          if (!refreshOptions.force && existing !== null && existing === feedVersion) {
            // The feed is already in the database. Record the check so the
            // staleness clock resets, but skip the expensive 10M-row rewrite.
            updateLastRefresh(new Date().toISOString());
            lastResult = 'up_to_date';
            return;
          }

          await runIngest({
            dbPath,
            buffer: toTransferable(buffer),
            feedVersion,
          });
          lastResult = 'started';
        } catch (err) {
          lastErrorMessage = err instanceof Error ? err.message : String(err);
          throw err;
        } finally {
          clearInterval(heartbeat);
          releaseRefreshLock(dbPath, lock);
        }
      })().finally(() => {
        running = false;
        current = null;
      });

      // Surface failures without crashing the process (unhandled rejection);
      // `whenIdle()` still observes the rejection.
      void current.catch((err: unknown) => {
        logger.error('refresh failed', {
          message: err instanceof Error ? err.message : String(err),
        });
      });
      return { status: 'started' };
    },
    isRefreshing() {
      return running;
    },
    whenIdle() {
      return current ?? Promise.resolve();
    },
    lastError() {
      return lastErrorMessage;
    },
    lastOutcome() {
      return lastResult;
    },
  };
}
