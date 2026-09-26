import { describe, expect, it } from 'vitest';
import { DEFAULT_THRESHOLDS, resolveThresholds, urgencyDotClass, urgencyLevel } from './urgency';

describe('urgencyLevel', () => {
  const t = { headsUpMinutes: 10, leaveNowMinutes: 5, missedMinutes: 1 };

  it('is relaxed well above the heads-up threshold', () => {
    expect(urgencyLevel(25, t)).toBe('relaxed');
    expect(urgencyLevel(11, t)).toBe('relaxed');
  });

  it('is heads-up exactly at the heads-up threshold (at-or-below)', () => {
    expect(urgencyLevel(10, t)).toBe('heads-up');
  });

  it('is heads-up between the heads-up and leave-now thresholds', () => {
    expect(urgencyLevel(7, t)).toBe('heads-up');
    expect(urgencyLevel(6, t)).toBe('heads-up');
  });

  it('is leave-now exactly at the leave-now threshold (at-or-below)', () => {
    expect(urgencyLevel(5, t)).toBe('leave-now');
  });

  it('is leave-now between the leave-now and missed thresholds', () => {
    expect(urgencyLevel(4, t)).toBe('leave-now');
    expect(urgencyLevel(2, t)).toBe('leave-now');
  });

  it('is missed exactly at the missed threshold (at-or-below)', () => {
    expect(urgencyLevel(1, t)).toBe('missed');
  });

  it('is missed for a bus already at the stop', () => {
    expect(urgencyLevel(0, t)).toBe('missed');
    expect(urgencyLevel(-3, t)).toBe('missed');
  });

  it('respects collapsed thresholds (two equal values)', () => {
    const collapsed = { headsUpMinutes: 5, leaveNowMinutes: 5, missedMinutes: 1 };
    expect(urgencyLevel(5, collapsed)).toBe('leave-now');
    expect(urgencyLevel(6, collapsed)).toBe('relaxed');
  });
});

describe('resolveThresholds', () => {
  it('returns the documented defaults when nothing is provided', () => {
    expect(resolveThresholds()).toEqual(DEFAULT_THRESHOLDS);
    expect(DEFAULT_THRESHOLDS).toEqual({
      headsUpMinutes: 10,
      leaveNowMinutes: 5,
      missedMinutes: 1,
    });
  });

  it('merges partial thresholds over the defaults', () => {
    expect(resolveThresholds({ missedMinutes: 2 })).toEqual({
      headsUpMinutes: 10,
      leaveNowMinutes: 5,
      missedMinutes: 2,
    });
  });

  it('passes through a fully resolved set', () => {
    const full = { headsUpMinutes: 12, leaveNowMinutes: 6, missedMinutes: 2 };
    expect(resolveThresholds(full)).toEqual(full);
  });
});

describe('urgencyDotClass', () => {
  it('maps each level to its hue', () => {
    expect(urgencyDotClass('relaxed')).toBe('bg-green-500');
    expect(urgencyDotClass('heads-up')).toBe('bg-amber-500');
    expect(urgencyDotClass('leave-now')).toBe('bg-orange-500');
    expect(urgencyDotClass('missed')).toBe('bg-slate-900');
  });
});
