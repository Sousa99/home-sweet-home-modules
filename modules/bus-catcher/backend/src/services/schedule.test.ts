import { describe, expect, it } from 'vitest';
import { createTestBackend, seedTestFeed } from '../test-utils/db';
import { createScheduleService } from './schedule';
import { AppError } from '../lib/errors';
import { setMetadata } from '../providers/carris-metropolitana/queries';

function setup() {
  const backend = createTestBackend();
  seedTestFeed(backend);
  const schedule = createScheduleService(backend.provider);
  return { backend, schedule };
}

const MONDAY_1030_UTC = new Date('2026-06-15T10:30:00Z');

describe('schedule service — getStopTimes', () => {
  it('returns upcoming times ordered by countdown', async () => {
    const { schedule } = setup();
    const times = await schedule.getStopTimes('S1', { now: MONDAY_1030_UTC });
    expect(times.map((t) => t.minutesUntil)).toEqual([10, 810]);
    expect(times[0]?.lineShortName).toBe('736');
  });

  it('respects the line filter', async () => {
    const { schedule } = setup();
    const filtered = await schedule.getStopTimes('S1', {
      now: MONDAY_1030_UTC,
      lines: ['706'],
    });
    expect(filtered).toEqual([]);
    expect(
      (await schedule.getStopTimes('S1', { now: MONDAY_1030_UTC, lines: ['736'] })).length,
    ).toBe(2);
  });

  it('respects the limit', async () => {
    const { schedule } = setup();
    expect((await schedule.getStopTimes('S1', { now: MONDAY_1030_UTC, limit: 1 })).length).toBe(1);
  });

  it('returns an empty list for a stop with no upcoming buses', async () => {
    const { schedule } = setup();
    // Wed 12:00 local; WD removed on 2026-06-17, yesterday's S2 bus already passed
    expect(await schedule.getStopTimes('S2', { now: new Date('2026-06-17T11:00:00Z') })).toEqual(
      [],
    );
  });

  it('throws 404 for an unknown stop', async () => {
    const { schedule } = setup();
    await expect(schedule.getStopTimes('NOPE', { now: MONDAY_1030_UTC })).rejects.toThrowError(
      AppError,
    );
  });
});

describe('schedule service — getStatus', () => {
  it('reports stale when never refreshed', async () => {
    const { schedule } = setup();
    const status = await schedule.getStatus();
    expect(status.lastRefresh).toBeNull();
    expect(status.stale).toBe(true);
    expect(status.refreshing).toBe(false);
  });

  it('reports fresh when refreshed recently', async () => {
    const { backend, schedule } = setup();
    setMetadata(backend.db, 'last_refresh', new Date().toISOString());
    setMetadata(backend.db, 'feed_version', 'abc123');
    const status = await schedule.getStatus();
    expect(status.feedVersion).toBe('abc123');
    expect(status.stale).toBe(false);
    expect(status.refreshing).toBe(false);
  });
});
