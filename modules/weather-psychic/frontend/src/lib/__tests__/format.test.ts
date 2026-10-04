import { describe, expect, it } from 'vitest';
import { formatDay, formatHour, formatLowHigh, formatPercent, formatTemperature } from '../format';

describe('formatTemperature', () => {
  it('rounds to a signed integer with the degree symbol', () => {
    expect(formatTemperature(21.4)).toBe('21°');
    expect(formatTemperature(-0.4)).toBe('0°');
    expect(formatTemperature(25)).toBe('25°');
  });
});

describe('formatHour', () => {
  it('formats an ISO timestamp as HH:MM', () => {
    expect(formatHour('2026-10-04T14:00:00Z')).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe('formatDay', () => {
  it('formats an ISO date as a short weekday+day', () => {
    const out = formatDay('2026-10-05');
    expect(out).toMatch(/Oct/);
    expect(out).toMatch(/5/);
  });
});

describe('formatLowHigh', () => {
  it('joins the low and high temperatures', () => {
    expect(formatLowHigh(14, 22)).toBe('14° / 22°');
  });
});

describe('formatPercent', () => {
  it('rounds to an integer percent', () => {
    expect(formatPercent(30)).toBe('30%');
    expect(formatPercent(31.6)).toBe('32%');
  });
});
