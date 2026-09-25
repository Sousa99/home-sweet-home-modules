import { describe, expect, it } from 'vitest';
import {
  createConfigStopBodySchema,
  lineOptionSchema,
  lineSchema,
  nextTimesQuerySchema,
  passingSchema,
  realtimeInfoSchema,
  searchStopsQuerySchema,
  statusSchema,
  stopTimesResponseSchema,
  updateConfigStopBodySchema,
} from './schemas';

describe('line schema', () => {
  it('accepts a valid line', () => {
    const parsed = lineSchema.safeParse({
      id: '736',
      shortName: '736',
      longName: 'Cais do Sodré',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects a line missing shortName', () => {
    const parsed = lineSchema.safeParse({ id: '736', longName: 'Cais' });
    expect(parsed.success).toBe(false);
  });
});

describe('lineOptionSchema', () => {
  it('accepts a per-direction line option', () => {
    const parsed = lineOptionSchema.safeParse({
      id: '736_0',
      shortName: '736',
      longName: 'Cais do Sodré',
      directionId: 0,
      headsign: 'Cais',
    });
    expect(parsed.success).toBe(true);
  });
});

describe('passing schema', () => {
  it('accepts a valid passing time', () => {
    const parsed = passingSchema.safeParse({
      lineId: '736',
      lineShortName: '736',
      headsign: 'Cais',
      scheduledAt: '2026-06-15T10:00:00.000Z',
      minutesUntil: 10,
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects a non-ISO scheduledAt', () => {
    const parsed = passingSchema.safeParse({
      lineId: '736',
      lineShortName: '736',
      headsign: 'Cais',
      scheduledAt: 'not-a-date',
      minutesUntil: 10,
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts a live passing with source, predictedAt and delayMinutes', () => {
    const parsed = passingSchema.safeParse({
      lineId: '736',
      lineShortName: '736',
      headsign: 'Cais',
      scheduledAt: '2026-06-15T10:00:00.000Z',
      minutesUntil: 10,
      source: 'live',
      predictedAt: '2026-06-15T09:57:00.000Z',
      delayMinutes: -3,
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects an unknown source value', () => {
    const parsed = passingSchema.safeParse({
      lineId: '736',
      lineShortName: '736',
      headsign: 'Cais',
      scheduledAt: '2026-06-15T10:00:00.000Z',
      minutesUntil: 10,
      source: 'estimated',
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts 001-only payloads unchanged (backward compatibility)', () => {
    const parsed = passingSchema.safeParse({
      lineId: '736',
      lineShortName: '736',
      headsign: 'Cais',
      scheduledAt: '2026-06-15T10:00:00.000Z',
      minutesUntil: 10,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.source).toBeUndefined();
  });
});

describe('status schema', () => {
  it('accepts nullable freshness fields', () => {
    expect(
      statusSchema.safeParse({
        lastRefresh: null,
        feedVersion: null,
        stale: false,
        refreshing: false,
      }).success,
    ).toBe(true);
  });

  it('accepts the optional realtime fields', () => {
    const parsed = statusSchema.safeParse({
      lastRefresh: null,
      feedVersion: null,
      stale: false,
      refreshing: false,
      realtimeLastUpdate: '2026-06-15T10:30:00.000Z',
      realtimeAvailable: true,
      realtimeStale: false,
    });
    expect(parsed.success).toBe(true);
  });
});

describe('realtimeInfoSchema', () => {
  it('accepts a valid coverage block', () => {
    expect(
      realtimeInfoSchema.safeParse({
        available: true,
        lastUpdate: '2026-06-15T10:30:00.000Z',
        liveCount: 3,
        totalCount: 5,
      }).success,
    ).toBe(true);
  });

  it('accepts an unavailable block', () => {
    expect(
      realtimeInfoSchema.safeParse({
        available: false,
        lastUpdate: null,
        liveCount: 0,
        totalCount: 5,
      }).success,
    ).toBe(true);
  });
});

describe('stopTimesResponseSchema', () => {
  it('accepts a times response with a realtime block', () => {
    expect(
      stopTimesResponseSchema.safeParse({
        stopId: 'S1',
        times: [
          {
            lineId: 'L1',
            lineShortName: '736',
            headsign: 'Cais',
            scheduledAt: '2026-06-15T10:00:00.000Z',
            minutesUntil: 10,
            source: 'live',
            predictedAt: '2026-06-15T09:57:00.000Z',
            delayMinutes: -3,
          },
        ],
        realtime: { available: true, lastUpdate: null, liveCount: 1, totalCount: 1 },
      }).success,
    ).toBe(true);
  });
});

describe('searchStopsQuerySchema', () => {
  it('applies the default limit', () => {
    const parsed = searchStopsQuerySchema.parse({ q: 'avenida' });
    expect(parsed.limit).toBe(20);
  });

  it('coerces a string limit', () => {
    expect(searchStopsQuerySchema.parse({ q: 'avenida', limit: '5' }).limit).toBe(5);
  });

  it('rejects an out-of-range limit', () => {
    expect(searchStopsQuerySchema.safeParse({ q: 'avenida', limit: 999 }).success).toBe(false);
  });

  it('rejects a query shorter than 2 chars', () => {
    expect(searchStopsQuerySchema.safeParse({ q: 'a' }).success).toBe(false);
  });
});

describe('nextTimesQuerySchema', () => {
  it('applies the default limit of 5', () => {
    expect(nextTimesQuerySchema.parse({}).limit).toBe(5);
  });

  it('accepts repeated line params as an array', () => {
    const parsed = nextTimesQuerySchema.parse({ limit: 3, line: ['736', '706'] });
    expect(parsed.line).toEqual(['736', '706']);
  });
});

describe('config stop bodies', () => {
  it('accepts a create body with only stopId', () => {
    const parsed = createConfigStopBodySchema.safeParse({ stopId: 'S1' });
    expect(parsed.success).toBe(true);
  });

  it('rejects an empty stopId', () => {
    expect(createConfigStopBodySchema.safeParse({ stopId: '' }).success).toBe(false);
  });

  it('accepts a partial update body', () => {
    const parsed = updateConfigStopBodySchema.safeParse({ enabled: false });
    expect(parsed.success).toBe(true);
  });
});
