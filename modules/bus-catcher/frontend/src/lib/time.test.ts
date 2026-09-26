import { describe, expect, it } from 'vitest';
import { formatDelay } from './time';

describe('formatDelay', () => {
  it('formats a late bus with a plus sign', () => {
    expect(formatDelay(4)).toBe('+4 min');
  });

  it('formats an early bus with a minus sign', () => {
    expect(formatDelay(-2)).toBe('-2 min');
  });

  it('labels an on-time bus without a misleading delta', () => {
    expect(formatDelay(0)).toBe('on time');
  });

  it('rounds fractional delays', () => {
    expect(formatDelay(4.6)).toBe('+5 min');
    expect(formatDelay(-3.2)).toBe('-3 min');
  });

  it('returns null for missing delays', () => {
    expect(formatDelay(null)).toBeNull();
    expect(formatDelay(undefined)).toBeNull();
  });
});
