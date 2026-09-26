import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestBackend, seedTestFeed } from '../test-utils/db';
import { createScheduleService } from './schedule';
import { AppError } from '../lib/errors';
import { setMetadata } from '../providers/carris-metropolitana/queries';
import * as schema from '../db/schema';
import type { LiveEtaProvider, RealtimeSnapshot } from '../providers/types';

function setup() {
  const backend = createTestBackend();
  seedTestFeed(backend);
  const schedule = createScheduleService(backend.provider);
  return { backend, schedule };
}

const MONDAY_1030_UTC = new Date('2026-06-15T10:30:00Z');

function stubRealtime(
  snapshot: RealtimeSnapshot,
  status?: {
    lastUpdate: string | null;
    available: boolean;
    stale: boolean;
  },
): LiveEtaProvider {
  return {
    getStopArrivals: async () => snapshot,
    getStatus: async () => status ?? { lastUpdate: null, available: false, stale: false },
  };
}

describe('schedule service — getStopTimes', () => {
  it('returns upcoming times ordered by countdown', async () => {
    const { schedule } = setup();
    const { times } = await schedule.getStopTimes('S1', { now: MONDAY_1030_UTC });
    expect(times.map((t) => t.minutesUntil)).toEqual([10, 810]);
    expect(times[0]?.lineShortName).toBe('736');
  });

  it('respects the line filter', async () => {
    const { schedule } = setup();
    const filtered = await schedule.getStopTimes('S1', {
      now: MONDAY_1030_UTC,
      lines: ['706'],
    });
    expect(filtered.times).toEqual([]);
    expect(
      (await schedule.getStopTimes('S1', { now: MONDAY_1030_UTC, lines: ['736'] })).times.length,
    ).toBe(2);
  });

  it('respects the limit', async () => {
    const { schedule } = setup();
    expect(
      (await schedule.getStopTimes('S1', { now: MONDAY_1030_UTC, limit: 1 })).times.length,
    ).toBe(1);
  });

  it('returns an empty list for a stop with no upcoming buses', async () => {
    const { schedule } = setup();
    // Wed 12:00 local; WD removed on 2026-06-17, yesterday's S2 bus already passed
    expect(
      (await schedule.getStopTimes('S2', { now: new Date('2026-06-17T11:00:00Z') })).times,
    ).toEqual([]);
  });

  it('throws 404 for an unknown stop', async () => {
    const { schedule } = setup();
    await expect(schedule.getStopTimes('NOPE', { now: MONDAY_1030_UTC })).rejects.toThrowError(
      AppError,
    );
  });

  it('reports realtime unavailable when no realtime provider is wired', async () => {
    const { schedule } = setup();
    const result = await schedule.getStopTimes('S1', { now: MONDAY_1030_UTC });
    expect(result.realtime).toEqual({
      available: false,
      lastUpdate: null,
      liveCount: 0,
      totalCount: result.times.length,
    });
  });
});

describe('schedule service — live merge (US1)', () => {
  function scheduleWithRealtime(snapshot: RealtimeSnapshot) {
    const backend = createTestBackend();
    seedTestFeed(backend);
    return {
      backend,
      schedule: createScheduleService(backend.provider, undefined, stubRealtime(snapshot)),
    };
  }

  const T2_ESTIMATED_MS = Date.parse('2026-06-15T10:33:00.000Z'); // T2 scheduled 10:40 → predicted 10:33
  const T2_SCHEDULED_MS = Date.parse('2026-06-15T10:40:00.000Z');
  const T4_SCHEDULED_MS = Date.parse('2026-06-16T00:00:00.000Z'); // T4 arrives 01:00 Lisbon

  const t2Prediction = {
    tripId: 'rt-T2',
    stopId: 'S1',
    lineId: '736',
    headsign: 'Cais',
    directionId: 0,
    estimatedAt: T2_ESTIMATED_MS,
    scheduledAt: T2_SCHEDULED_MS,
    fetchedAt: Date.parse('2026-06-15T10:30:00.000Z'),
  };

  it('marks a matching fresh prediction as live with predictedAt and delayMinutes', async () => {
    const { schedule } = scheduleWithRealtime({
      arrivals: [t2Prediction],
      fetchedAt: Date.parse('2026-06-15T10:30:00.000Z'),
      available: true,
    });

    const { times, realtime } = await schedule.getStopTimes('S1', { now: MONDAY_1030_UTC });
    const live = times.find((t) => t.source === 'live');
    expect(live?.lineShortName).toBe('736');
    expect(live?.predictedAt).toBe(new Date(T2_ESTIMATED_MS).toISOString());
    expect(live?.delayMinutes).toBe(-7);
    expect(realtime.available).toBe(true);
    expect(realtime.liveCount).toBeGreaterThanOrEqual(1);
  });

  it('leaves passings scheduled when no prediction matches', async () => {
    const { schedule } = scheduleWithRealtime({
      arrivals: [],
      fetchedAt: Date.parse('2026-06-15T10:30:00.000Z'),
      available: true,
    });
    const { times } = await schedule.getStopTimes('S1', { now: MONDAY_1030_UTC });
    for (const t of times) {
      expect(t.source).toBeUndefined();
      expect(t.predictedAt).toBeUndefined();
    }
  });

  it('demotes a stale prediction so stale data is never shown as live', async () => {
    const { schedule } = scheduleWithRealtime({
      arrivals: [t2Prediction],
      fetchedAt: Date.parse('2026-06-15T10:30:00.000Z'),
      available: false,
    });
    const { times, realtime } = await schedule.getStopTimes('S1', { now: MONDAY_1030_UTC });
    for (const t of times) {
      expect(t.source).toBeUndefined();
    }
    expect(realtime.available).toBe(false);
    expect(realtime.liveCount).toBe(0);
  });

  it('keeps a passing scheduled when its prediction has no estimated time', async () => {
    const { schedule } = scheduleWithRealtime({
      arrivals: [{ ...t2Prediction, estimatedAt: null }],
      fetchedAt: Date.parse('2026-06-15T10:30:00.000Z'),
      available: true,
    });
    const { times } = await schedule.getStopTimes('S1', { now: MONDAY_1030_UTC });
    const t2 = times.find((t) => t.minutesUntil === 10);
    expect(t2?.source).toBeUndefined();
  });

  it('does not match predictions whose scheduled time is outside the tolerance', async () => {
    const { schedule } = scheduleWithRealtime({
      arrivals: [
        {
          ...t2Prediction,
          // 20 minutes off from T2's scheduled 10:40 → no match
          scheduledAt: Date.parse('2026-06-15T11:00:00.000Z'),
        },
      ],
      fetchedAt: Date.parse('2026-06-15T10:30:00.000Z'),
      available: true,
    });
    const { times } = await schedule.getStopTimes('S1', { now: MONDAY_1030_UTC });
    expect(times.every((t) => t.source === undefined)).toBe(true);
  });

  it('prefers a prediction with the same direction when several could match', async () => {
    const { schedule } = scheduleWithRealtime({
      arrivals: [
        { ...t2Prediction, directionId: 1, estimatedAt: Date.parse('2026-06-15T10:55:00.000Z') },
        t2Prediction, // direction 0, predicted 10:33
      ],
      fetchedAt: Date.parse('2026-06-15T10:30:00.000Z'),
      available: true,
    });
    const { times } = await schedule.getStopTimes('S1', { now: MONDAY_1030_UTC });
    const live = times.find((t) => t.source === 'live');
    expect(live?.predictedAt).toBe(new Date(T2_ESTIMATED_MS).toISOString());
    expect(live?.delayMinutes).toBe(-7);
  });

  it('sorts by the shown time (predicted when live, else scheduled)', async () => {
    const { schedule } = scheduleWithRealtime({
      arrivals: [
        {
          ...t2Prediction,
          tripId: 'rt-T4',
          // T4 scheduled next day (~01:00 Lisbon) but predicted within minutes
          estimatedAt: Date.parse('2026-06-15T10:32:00.000Z'),
          scheduledAt: T4_SCHEDULED_MS,
        },
      ],
      fetchedAt: Date.parse('2026-06-15T10:30:00.000Z'),
      available: true,
    });
    const { times } = await schedule.getStopTimes('S1', { now: MONDAY_1030_UTC });
    // T4 is predicted at 10:32 (2 min away) → should sort before T2 (10 min away)
    expect(times[0]?.source).toBe('live');
    expect(times[0]?.minutesUntil).toBeLessThan(10);
  });
});

describe('schedule service — realtime stop id mapping', () => {
  it('fetches realtime arrivals with the stop realtime id when set', async () => {
    const backend = createTestBackend();
    seedTestFeed(backend);
    backend.db
      .update(schema.stops)
      .set({ realtimeId: 'RT-S1' })
      .where(eq(schema.stops.id, 'S1'))
      .run();

    let requested: string | undefined;
    const realtime: LiveEtaProvider = {
      getStopArrivals: async (stopId) => {
        requested = stopId;
        return { arrivals: [], fetchedAt: 0, available: false };
      },
      getStatus: async () => ({ lastUpdate: null, available: false, stale: false }),
    };
    const schedule = createScheduleService(backend.provider, undefined, realtime);

    await schedule.getStopTimes('S1', { now: MONDAY_1030_UTC });
    expect(requested).toBe('RT-S1');
  });

  it('falls back to the stop id when no realtime id is set', async () => {
    const backend = createTestBackend();
    seedTestFeed(backend);

    let requested: string | undefined;
    const realtime: LiveEtaProvider = {
      getStopArrivals: async (stopId) => {
        requested = stopId;
        return { arrivals: [], fetchedAt: 0, available: false };
      },
      getStatus: async () => ({ lastUpdate: null, available: false, stale: false }),
    };
    const schedule = createScheduleService(backend.provider, undefined, realtime);

    await schedule.getStopTimes('S1', { now: MONDAY_1030_UTC });
    expect(requested).toBe('S1');
  });

  it('tries the legacy 0-prefixed id when a 3-prefixed stop has no realtime id', async () => {
    const backend = createTestBackend();
    seedTestFeed(backend);
    // Simulates a DB ingested before the realtime_id column existed: the
    // static feed renumbered 320001 → legacy 020001, which the realtime feed
    // still uses.
    backend.db
      .insert(schema.stops)
      .values({ id: '320001', name: 'Portagens', lat: 0, lon: 0 })
      .run();

    const requested: string[] = [];
    const realtime: LiveEtaProvider = {
      getStopArrivals: async (stopId) => {
        requested.push(stopId);
        if (stopId === '020001') {
          return {
            arrivals: [
              {
                tripId: 'rt',
                stopId: '320001',
                lineId: '736',
                headsign: 'Cais',
                directionId: 0,
                estimatedAt: 0,
                scheduledAt: 0,
                fetchedAt: 0,
              },
            ],
            fetchedAt: Date.now(),
            available: true,
          };
        }
        // The realtime feed returns 404 for the renumbered GTFS id.
        return { arrivals: [], fetchedAt: Date.now(), available: false, unknownStop: true };
      },
      getStatus: async () => ({ lastUpdate: null, available: false, stale: false }),
    };
    const schedule = createScheduleService(backend.provider, undefined, realtime);

    await schedule.getStopTimes('320001', { now: MONDAY_1030_UTC });
    expect(requested).toEqual(['320001', '020001']);
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

  it('surfaces realtime freshness fields when a realtime provider is wired', async () => {
    const backend = createTestBackend();
    seedTestFeed(backend);
    const schedule = createScheduleService(
      backend.provider,
      undefined,
      stubRealtime(
        { arrivals: [], fetchedAt: 0, available: true },
        { lastUpdate: '2026-06-15T10:30:00.000Z', available: true, stale: false },
      ),
    );
    const status = await schedule.getStatus();
    expect(status.realtimeLastUpdate).toBe('2026-06-15T10:30:00.000Z');
    expect(status.realtimeAvailable).toBe(true);
    expect(status.realtimeStale).toBe(false);
  });
});
