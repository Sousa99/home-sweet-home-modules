import { describe, expect, it } from 'vitest';
import { formatLastUpdated } from '../formatLastUpdated';

const FULL_TIMESTAMP = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} .+$/;

function expectedZone(timestamp: number): string {
  const zone = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' })
    .formatToParts(new Date(timestamp))
    .find((part) => part.type === 'timeZoneName')?.value;
  return zone ?? '';
}

describe('formatLastUpdated', () => {
  it('returns "Not updated yet" for null', () => {
    expect(formatLastUpdated(null)).toBe('Not updated yet');
  });

  it('renders a full timestamp: date, 24-hour time, and timezone', () => {
    const timestamp = new Date(2026, 9, 4, 14, 32, 5).getTime();
    expect(formatLastUpdated(timestamp)).toBe(`2026-10-04 14:32:05 ${expectedZone(timestamp)}`);
    expect(formatLastUpdated(timestamp)).toMatch(FULL_TIMESTAMP);
  });

  it('zero-pads the date and time parts', () => {
    const timestamp = new Date(2026, 0, 1, 9, 7, 3).getTime();
    expect(formatLastUpdated(timestamp)).toBe(`2026-01-01 09:07:03 ${expectedZone(timestamp)}`);
  });

  it('reflects the device clock (not UTC)', () => {
    // 21:42:58 UTC is 14:42:58 in UTC-7 and 22:42:58 in UTC+1; the rendered
    // value must match the device's local timezone, so it must never equal the
    // UTC time portion when the local offset is non-zero.
    const timestamp = Date.UTC(2026, 9, 4, 21, 42, 58);
    const local = formatLastUpdated(timestamp);
    expect(local).toMatch(FULL_TIMESTAMP);
    if (new Date(timestamp).getTimezoneOffset() !== 0) {
      expect(local).not.toContain('21:42:58');
    }
  });

  it('formats midnight and just-before-midnight boundaries', () => {
    const midnight = new Date(2026, 9, 4, 0, 0, 0).getTime();
    const lastSecond = new Date(2026, 9, 4, 23, 59, 59).getTime();
    expect(formatLastUpdated(midnight)).toBe(`2026-10-04 00:00:00 ${expectedZone(midnight)}`);
    expect(formatLastUpdated(lastSecond)).toBe(`2026-10-04 23:59:59 ${expectedZone(lastSecond)}`);
  });
});
