import { describe, expect, it } from 'vitest';
import { formatLastUpdated } from '../formatLastUpdated';

describe('formatLastUpdated', () => {
  it('returns "Not updated yet" for null', () => {
    expect(formatLastUpdated(null)).toBe('Not updated yet');
  });

  it('renders a timestamp as the device-local 24-hour HH:MM:SS', () => {
    const timestamp = new Date(2026, 9, 4, 14, 32, 5).getTime();
    expect(formatLastUpdated(timestamp)).toBe('14:32:05');
  });

  it('zero-pads hours, minutes, and seconds', () => {
    const timestamp = new Date(2026, 0, 1, 9, 7, 3).getTime();
    expect(formatLastUpdated(timestamp)).toBe('09:07:03');
  });

  it('reflects the device clock (not UTC)', () => {
    // 21:42:58 UTC is 14:42:58 in UTC-7 and 22:42:58 in UTC+1; the rendered
    // value must match the device's local timezone, so it must never equal the
    // UTC rendering when the local offset is non-zero.
    const timestamp = Date.UTC(2026, 9, 4, 21, 42, 58);
    const local = formatLastUpdated(timestamp);
    expect(local).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    if (new Date(timestamp).getTimezoneOffset() !== 0) {
      expect(local).not.toBe('21:42:58');
    }
  });

  it('formats midnight and just-before-midnight boundaries', () => {
    expect(formatLastUpdated(new Date(2026, 9, 4, 0, 0, 0).getTime())).toBe('00:00:00');
    expect(formatLastUpdated(new Date(2026, 9, 4, 23, 59, 59).getTime())).toBe('23:59:59');
  });
});
