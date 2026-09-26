import { describe, expect, it } from 'vitest';
import { countdownMinutes, dateToServiceDay, minutesToDate } from './time';

const LISBON = 'Europe/Lisbon';

describe('minutesToDate', () => {
  it('converts a winter wall-clock time (WET, UTC+0)', () => {
    expect(minutesToDate(540, '2026-03-15', LISBON).toISOString()).toBe('2026-03-15T09:00:00.000Z');
  });

  it('converts a summer wall-clock time (WEST, UTC+1)', () => {
    expect(minutesToDate(540, '2026-06-15', LISBON).toISOString()).toBe('2026-06-15T08:00:00.000Z');
  });

  it('handles times past midnight (25:30 spills into next day)', () => {
    // 25:30 = 01:30 next local day; summer offset +1 → 00:30Z
    expect(minutesToDate(1530, '2026-06-15', LISBON).toISOString()).toBe(
      '2026-06-16T00:30:00.000Z',
    );
  });

  it('is DST-correct on the spring transition day (2026-03-29)', () => {
    // 00:30 local is still WET (UTC+0)
    expect(minutesToDate(30, '2026-03-29', LISBON).toISOString()).toBe('2026-03-29T00:30:00.000Z');
    // 02:00 local is already WEST (UTC+1)
    expect(minutesToDate(120, '2026-03-29', LISBON).toISOString()).toBe('2026-03-29T01:00:00.000Z');
  });

  it('is DST-correct on the autumn transition day (2026-10-25)', () => {
    // 03:00 local after fall-back is WET (UTC+0)
    expect(minutesToDate(180, '2026-10-25', LISBON).toISOString()).toBe('2026-10-25T03:00:00.000Z');
  });
});

describe('dateToServiceDay', () => {
  it('returns the local calendar date in the zone', () => {
    // 23:30Z on Jun 15 is 00:30 local on Jun 16 (WEST)
    expect(dateToServiceDay(new Date('2026-06-15T23:30:00Z'), LISBON)).toBe('2026-06-16');
    expect(dateToServiceDay(new Date('2026-06-15T22:30:00Z'), LISBON)).toBe('2026-06-15');
  });

  it('is DST-aware near the autumn transition', () => {
    // 00:30Z on Oct 25 is 01:30 local (WEST) → still Oct 25
    expect(dateToServiceDay(new Date('2026-10-25T00:30:00Z'), LISBON)).toBe('2026-10-25');
  });
});

describe('countdownMinutes', () => {
  it('rounds up to the next whole minute', () => {
    const now = new Date('2026-06-15T10:00:00Z');
    const target = new Date('2026-06-15T10:01:30Z');
    expect(countdownMinutes(now, target)).toBe(2);
  });

  it('returns negative when the target already passed', () => {
    const now = new Date('2026-06-15T10:05:00Z');
    const target = new Date('2026-06-15T10:00:00Z');
    expect(countdownMinutes(now, target)).toBe(-5);
  });

  it('returns zero for an immediate target', () => {
    const now = new Date('2026-06-15T10:00:00Z');
    expect(countdownMinutes(now, now)).toBe(0);
  });
});
