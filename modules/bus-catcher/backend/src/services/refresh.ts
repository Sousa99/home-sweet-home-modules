import { createHash } from 'node:crypto';
import { Worker } from 'node:worker_threads';
import { config } from '../config';
import { logger } from '../lib/logger';
import { downloadGtfs } from '../providers/carris-metropolitana/gtfs';

export type RefreshStatus = 'started' | 'in_progress';

export interface RefreshService {
  refresh(): { status: RefreshStatus };
  isRefreshing(): boolean;
  whenIdle(): Promise<void>;
}

export interface RefreshServiceOptions {
  dbPath: string;
  feedUrl?: string;
  download?: (url: string) => Promise<Uint8Array>;
  feedVersionOf?: (buffer: Uint8Array) => string;
}

function sha256Prefix(buffer: Uint8Array): string {
  return createHash('sha256').update(buffer).digest('hex').slice(0, 12);
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

export function createRefreshService(options: RefreshServiceOptions): RefreshService {
  const {
    dbPath,
    feedUrl = config.feedUrl,
    download = downloadGtfs,
    feedVersionOf = sha256Prefix,
  } = options;

  let running = false;
  let current: Promise<void> | null = null;

  return {
    refresh() {
      if (running) return { status: 'in_progress' };
      running = true;
      // Download on the main thread (async, non-blocking); the heavy parse +
      // atomic ingest runs on a worker thread so the server stays responsive.
      current = (async () => {
        const buffer = await download(feedUrl);
        const feedVersion = feedVersionOf(buffer);
        await new Promise<void>((resolve, reject) => {
          const { url, execArgv } = workerOptions();
          const worker = new Worker(url, execArgv ? { execArgv } : undefined);
          let settled = false;
          worker.once('message', (message: { ok: boolean; error?: string }) => {
            settled = true;
            worker.terminate();
            if (message.ok) resolve();
            else reject(new Error(message.error ?? 'refresh failed'));
          });
          worker.once('error', (err) => {
            if (settled) return;
            settled = true;
            worker.terminate();
            reject(err);
          });
          worker.once('exit', (code) => {
            if (settled) return;
            settled = true;
            reject(new Error(`refresh worker exited with code ${code}`));
          });
          worker.postMessage({ dbPath, buffer, feedVersion });
        });
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
  };
}
