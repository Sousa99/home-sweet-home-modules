import { describe, expect, it } from 'vitest';
import { getStop, listLines, nextTimes, resolveActiveServiceIds, searchStops } from './queries';
import { createTestDb, seedTestFeed } from '../../test-utils/db';

function setup() {
  const testDb = createTestDb();
  seedTestFeed(testDb);
  return testDb;
}

describe('resolveActiveServiceIds', () => {
  it('resolves weekday service on a Monday', () => {
    const { db } = setup();
    expect(resolveActiveServiceIds(db, '2026-06-15')).toEqual(['WD']);
  });

  it('resolves weekend service on a Sunday', () => {
    const { db } = setup();
    expect(resolveActiveServiceIds(db, '2026-06-14')).toEqual(['WE']);
  });

  it('honors calendar_dates removal', () => {
    const { db } = setup();
    expect(resolveActiveServiceIds(db, '2026-06-17')).toEqual([]);
  });
});

describe('searchStops', () => {
  it('finds stops by name substring', () => {
    const { db } = setup();
    const found = searchStops(db, 'teste', 20);
    expect(found.map((s) => s.id).sort()).toEqual(['S1', 'S2']);
  });

  it('returns an empty list when nothing matches', () => {
    const { db } = setup();
    expect(searchStops(db, 'zzz', 20)).toEqual([]);
  });
});

describe('listLines', () => {
  it('returns all lines', () => {
    const { db } = setup();
    expect(
      listLines(db)
        .map((l) => l.id)
        .sort(),
    ).toEqual(['L1', 'L2']);
  });
});

describe('getStop', () => {
  it('returns the stop with its serving lines', () => {
    const { db } = setup();
    const stop = getStop(db, 'S1');
    expect(stop?.id).toBe('S1');
    expect(stop?.lines.map((l) => l.id).sort()).toEqual(['L1', 'L2']);
  });

  it('returns null for an unknown stop', () => {
    const { db } = setup();
    expect(getStop(db, 'NOPE')).toBeNull();
  });
});

describe('nextTimes', () => {
  it('returns upcoming weekday buses ordered by time', () => {
    const { db } = setup();
    const now = new Date('2026-06-15T10:30:00Z'); // Mon 11:30 local
    const times = nextTimes(db, 'S1', { now });
    // T2 (11:40 local, 10 min away) then T4 (Mon 25:00 → Tue 01:00 local, 810 min)
    expect(times.map((t) => t.minutesUntil)).toEqual([10, 810]);
    expect(times[0]!.lineShortName).toBe('736');
    expect(times[0]!.headsign).toBe('Cais');
  });

  it('respects the line filter', () => {
    const { db } = setup();
    const now = new Date('2026-06-15T10:30:00Z');
    expect(nextTimes(db, 'S1', { now, lines: ['706'] })).toEqual([]);
    expect(nextTimes(db, 'S1', { now, lines: ['736'] }).length).toBe(2);
  });

  it('returns weekend buses on a Sunday with a line filter', () => {
    const { db } = setup();
    const now = new Date('2026-06-14T10:30:00Z'); // Sun 11:30 local
    const times = nextTimes(db, 'S1', { now, lines: ['706'] });
    expect(times).toHaveLength(1);
    expect(times[0]!.minutesUntil).toBe(30); // T3 at 12:00 local
  });

  it('honors the limit', () => {
    const { db } = setup();
    const now = new Date('2026-06-15T10:30:00Z');
    expect(nextTimes(db, 'S1', { now, limit: 1 })).toHaveLength(1);
  });

  it('surfaces overnight service from the previous service day', () => {
    const { db } = setup();
    // Tue 23:30Z = Wed 00:30 local; WD active on Tue (2026-06-16, no exception)
    const now = new Date('2026-06-16T23:30:00Z');
    const times = nextTimes(db, 'S1', { now });
    // T4's Tue instance arrives Wed 01:00 local (1500 min → 25:00) → 30 min away
    expect(times[0]!.minutesUntil).toBe(30);
    expect(times[0]!.lineShortName).toBe('736');
  });

  it('returns no service when today is removed via calendar_dates', () => {
    const { db } = setup();
    // Wed 11:00Z = Wed 12:00 local; WD removed on 2026-06-17, and yesterday's
    // T1 at S2 (Tue 10:15 local) has already passed.
    const now = new Date('2026-06-17T11:00:00Z');
    expect(nextTimes(db, 'S2', { now })).toEqual([]);
  });
});
