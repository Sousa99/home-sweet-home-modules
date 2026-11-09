import { afterEach, describe, expect, it, vi } from 'vitest';
import { createScheduleLifecycle, type ScheduleStatus } from './lifecycle';
import type { RefreshService } from './refresh';

const silentLog = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

function stubRefresh(onRefresh?: () => void): Pick<RefreshService, 'refresh' | 'isRefreshing'> {
  return {
    refresh: vi.fn(() => {
      onRefresh?.();
      return { status: 'started' as const };
    }),
    isRefreshing: vi.fn(() => false),
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('schedule lifecycle', () => {
  it('triggers a refresh when the database has never been loaded', async () => {
    const status: ScheduleStatus = { lastRefresh: null, stale: true };
    const refresh = stubRefresh();
    const lifecycle = createScheduleLifecycle({
      getStatus: async () => status,
      refresh,
      intervalMs: 60_000,
      log: silentLog,
    });

    await lifecycle.checkNow();
    expect(refresh.refresh).toHaveBeenCalledTimes(1);
  });

  it('triggers a refresh when the schedule is stale', async () => {
    const status: ScheduleStatus = {
      lastRefresh: '2026-06-01T00:00:00.000Z',
      stale: true,
    };
    const refresh = stubRefresh();
    const lifecycle = createScheduleLifecycle({
      getStatus: async () => status,
      refresh,
      intervalMs: 60_000,
      log: silentLog,
    });

    await lifecycle.checkNow();
    expect(refresh.refresh).toHaveBeenCalledTimes(1);
  });

  it('does not refresh a fresh schedule or one already refreshing', async () => {
    const status: ScheduleStatus = {
      lastRefresh: '2026-06-01T00:00:00.000Z',
      stale: false,
    };
    const refresh = stubRefresh();
    const lifecycle = createScheduleLifecycle({
      getStatus: async () => status,
      refresh,
      intervalMs: 60_000,
      log: silentLog,
    });

    await lifecycle.checkNow();
    expect(refresh.refresh).not.toHaveBeenCalled();

    const refreshing = {
      refresh: vi.fn(() => ({ status: 'started' as const })),
      isRefreshing: vi.fn(() => true),
    };
    const busyLifecycle = createScheduleLifecycle({
      getStatus: async () => ({ lastRefresh: null, stale: true }),
      refresh: refreshing,
      intervalMs: 60_000,
      log: silentLog,
    });
    await busyLifecycle.checkNow();
    expect(refreshing.refresh).not.toHaveBeenCalled();
  });

  it('checks on start, then on the interval, and stops cleanly', async () => {
    vi.useFakeTimers();
    const status: ScheduleStatus = { lastRefresh: null, stale: true };
    const refresh = stubRefresh(() => {
      status.lastRefresh = '2026-06-01T00:00:00.000Z';
      status.stale = false;
    });
    const lifecycle = createScheduleLifecycle({
      getStatus: async () => status,
      refresh,
      intervalMs: 1_000,
      log: silentLog,
    });

    lifecycle.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(refresh.refresh).toHaveBeenCalledTimes(1);

    // Fresh now: the next tick is a no-op.
    await vi.advanceTimersByTimeAsync(1_000);
    expect(refresh.refresh).toHaveBeenCalledTimes(1);

    // Stale again: the next tick refreshes.
    status.stale = true;
    await vi.advanceTimersByTimeAsync(1_000);
    expect(refresh.refresh).toHaveBeenCalledTimes(2);

    lifecycle.stop();
    status.stale = true;
    await vi.advanceTimersByTimeAsync(1_000);
    expect(refresh.refresh).toHaveBeenCalledTimes(2);
  });

  it('logs and swallows status errors', async () => {
    const refresh = stubRefresh();
    const lifecycle = createScheduleLifecycle({
      getStatus: async () => {
        throw new Error('db unavailable');
      },
      refresh,
      intervalMs: 60_000,
      log: silentLog,
    });

    await expect(lifecycle.checkNow()).resolves.toBeUndefined();
    expect(refresh.refresh).not.toHaveBeenCalled();
    expect(silentLog.error).toHaveBeenCalledWith('schedule lifecycle check failed', {
      message: 'db unavailable',
    });
  });
});
