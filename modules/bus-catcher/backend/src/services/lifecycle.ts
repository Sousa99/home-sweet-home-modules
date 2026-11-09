import { logger } from '../lib/logger';
import type { RefreshService } from './refresh';

export interface ScheduleStatus {
  lastRefresh: string | null;
  stale: boolean;
}

export interface ScheduleLifecycleOptions {
  /** Reads the current schedule freshness (provider.getStatus). */
  getStatus: () => Promise<ScheduleStatus>;
  refresh: Pick<RefreshService, 'refresh' | 'isRefreshing'>;
  /** How often to re-check staleness after the initial boot check. */
  intervalMs: number;
  log?: Pick<typeof logger, 'info' | 'warn' | 'error'>;
}

export interface ScheduleLifecycle {
  start(): void;
  stop(): void;
  /** Run one staleness check now (exported for tests and future callers). */
  checkNow(): Promise<void>;
}

/**
 * Keeps the local schedule populated without human intervention: checks once at
 * boot (loads a fresh/empty database) and then periodically. The refresh
 * service itself is single-flight and skips re-ingest when the upstream feed
 * is unchanged, so a frequent check is cheap after the first load.
 */
export function createScheduleLifecycle(options: ScheduleLifecycleOptions): ScheduleLifecycle {
  const log = options.log ?? logger;
  let timer: ReturnType<typeof setInterval> | null = null;
  let checking = false;

  async function checkNow(): Promise<void> {
    if (checking || options.refresh.isRefreshing()) return;
    checking = true;
    try {
      const status = await options.getStatus();
      if (status.lastRefresh === null || status.stale) {
        const reason = status.lastRefresh === null ? 'never_loaded' : 'stale';
        const result = options.refresh.refresh();
        log.info('schedule auto-refresh', { reason, status: result.status });
      }
    } catch (err) {
      log.error('schedule lifecycle check failed', {
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      checking = false;
    }
  }

  return {
    checkNow,
    start() {
      if (timer !== null) return;
      void checkNow();
      timer = setInterval(() => {
        void checkNow();
      }, options.intervalMs);
      // Never keep the process alive just for the refresh timer.
      timer.unref?.();
    },
    stop() {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    },
  };
}
