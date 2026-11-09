import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { zipSync, strToU8 } from 'fflate';
import { createTestDbAt, type TestDb } from '../test-utils/db';
import { createCarrisMetropolitanaProvider } from '../providers/carris-metropolitana';
import { getMetadata } from '../providers/carris-metropolitana/queries';
import { createConfigService } from './config';
import { createRefreshService, type RefreshIngestInput } from './refresh';
import { createScheduleService } from './schedule';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempDbPath(): string {
  const dir = mkdtempSync(join(tmpdir(), 'bus-catcher-test-'));
  tempDirs.push(dir);
  return join(dir, 'test.db');
}

function openDb(dbPath: string): TestDb {
  return createTestDbAt(dbPath);
}

function fixtureZip(): Uint8Array {
  return zipSync({
    'routes.txt': strToU8('route_id,route_short_name\nR1,100\n'),
    'stops.txt': strToU8('stop_id,stop_name\nZ1,Paragem Nova\n'),
    'trips.txt': strToU8('trip_id,route_id,service_id,trip_headsign\nT1,R1,SRV,Z1\n'),
    'stop_times.txt': strToU8(
      'trip_id,arrival_time,departure_time,stop_id,stop_sequence\nT1,10:00:00,10:00:00,Z1,1\n',
    ),
    'calendar.txt': strToU8(
      'service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\nSRV,1,1,1,1,1,1,1,20260101,20261231\n',
    ),
  });
}

function setup(dbPath: string) {
  const provider = createCarrisMetropolitanaProvider(openDb(dbPath).db);
  // Fresh bytes per call: the worker takes ownership of the buffer (transfer),
  // which detaches it — a cached fixture would be empty on the next refresh.
  const download = vi.fn().mockImplementation(async () => fixtureZip());
  const refresh = createRefreshService({
    dbPath,
    download,
    feedUrl: 'http://fixture/gtfs.zip',
  });
  const schedule = createScheduleService(provider, refresh);
  return { provider, download, refresh, schedule };
}

describe('refresh service', () => {
  it('starts a refresh, ingests the feed, and updates metadata', async () => {
    const dbPath = makeTempDbPath();
    const { provider, refresh } = setup(dbPath);
    const testDb = openDb(dbPath);

    expect(refresh.refresh().status).toBe('started');
    await refresh.whenIdle();

    expect(getMetadata(testDb.db, 'last_refresh')).not.toBeNull();
    expect(getMetadata(testDb.db, 'feed_version')).toHaveLength(12);

    const stop = await provider.getStop('Z1');
    expect(stop?.name).toBe('Paragem Nova');
  });

  it(
    'replaces the feed with FK enforcement enabled and preserves config',
    { timeout: 20000 },
    async () => {
      const dbPath = makeTempDbPath();
      const { refresh } = setup(dbPath);
      expect(refresh.refresh().status).toBe('started');
      await refresh.whenIdle();

      const testDb = openDb(dbPath);
      const config = createConfigService(testDb.db);
      config.addConfigStop({ stopId: 'Z1' });

      expect(refresh.refresh({ force: true }).status).toBe('started');
      await refresh.whenIdle();

      expect(config.getConfigStop(1)?.stop.id).toBe('Z1');
      expect(getMetadata(testDb.db, 'last_refresh')).not.toBeNull();
    },
  );

  it('is single-flight: concurrent calls return in_progress', { timeout: 20000 }, async () => {
    const dbPath = makeTempDbPath();
    const { refresh } = setup(dbPath);

    expect(refresh.refresh().status).toBe('started');
    expect(refresh.refresh().status).toBe('in_progress');

    await refresh.whenIdle();
    expect(refresh.isRefreshing()).toBe(false);
    expect(refresh.refresh().status).toBe('started');
    await refresh.whenIdle();
  });

  it('exposes the refreshing state through getStatus', async () => {
    const dbPath = makeTempDbPath();
    const { refresh, schedule } = setup(dbPath);

    refresh.refresh();
    expect((await schedule.getStatus()).refreshing).toBe(true);

    await refresh.whenIdle();
    expect((await schedule.getStatus()).refreshing).toBe(false);
  });

  it('releases the lock and does not crash when the download fails', async () => {
    const dbPath = makeTempDbPath();
    const download = vi
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValue(fixtureZip());
    const refresh = createRefreshService({
      dbPath,
      download,
      feedUrl: 'http://fixture/gtfs.zip',
    });

    expect(refresh.refresh().status).toBe('started');
    await expect(refresh.whenIdle()).rejects.toThrowError('network down');
    expect(refresh.isRefreshing()).toBe(false);
    expect(refresh.lastError()).toBe('network down');

    // a retry is possible and succeeds
    expect(refresh.refresh().status).toBe('started');
    await refresh.whenIdle();
    const testDb = openDb(dbPath);
    expect(getMetadata(testDb.db, 'last_refresh')).not.toBeNull();
    expect(refresh.lastError()).toBeNull();
  });

  it('skips re-ingest when the upstream feed version is unchanged', async () => {
    const dbPath = makeTempDbPath();
    let current: string | null = null;
    const runIngest = vi.fn(async (input: RefreshIngestInput) => {
      current = input.feedVersion;
    });
    const download = vi.fn().mockResolvedValue(fixtureZip());
    const updateLastRefresh = vi.fn();
    const refresh = createRefreshService({
      dbPath,
      download,
      feedUrl: 'http://fixture/gtfs.zip',
      getCurrentFeedVersion: () => current,
      runIngest,
      updateLastRefresh,
    });

    expect(refresh.refresh().status).toBe('started');
    await refresh.whenIdle();
    expect(runIngest).toHaveBeenCalledTimes(1);
    expect(refresh.lastOutcome()).toBe('started');

    expect(refresh.refresh().status).toBe('started');
    await refresh.whenIdle();
    expect(runIngest).toHaveBeenCalledTimes(1);
    expect(refresh.lastOutcome()).toBe('up_to_date');
    expect(updateLastRefresh).toHaveBeenCalledTimes(1);

    // force bypasses the skip
    expect(refresh.refresh({ force: true }).status).toBe('started');
    await refresh.whenIdle();
    expect(runIngest).toHaveBeenCalledTimes(2);
    expect(refresh.lastOutcome()).toBe('started');
  });

  it('reports in_progress when another process holds the refresh lock', async () => {
    const dbPath = makeTempDbPath();
    writeFileSync(`${dbPath}.refresh.lock`, '');
    const download = vi.fn().mockResolvedValue(fixtureZip());
    const refresh = createRefreshService({
      dbPath,
      download,
      feedUrl: 'http://fixture/gtfs.zip',
    });

    expect(refresh.refresh().status).toBe('in_progress');
    await expect(refresh.whenIdle()).resolves.toBeUndefined();
    expect(download).not.toHaveBeenCalled();
  });
});
