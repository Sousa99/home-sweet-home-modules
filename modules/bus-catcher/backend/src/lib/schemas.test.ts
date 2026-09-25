import { describe, expect, it } from 'vitest';
import {
  createConfigStopBodySchema,
  lineSchema,
  nextTimesQuerySchema,
  passingSchema,
  searchStopsQuerySchema,
  statusSchema,
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
