import { beforeEach, describe, expect, it } from 'vitest';
import { formatTimeParts, getTimeFormat, setTimeFormat } from '../src/lib/timeFormat';
import type { TimeFormat } from '../src/lib/timeFormat';

const STORAGE_KEY = 'current-time:time-format';

describe('formatTimeParts', () => {
  it('formats a 24-hour time with zero-padded hours, minutes and seconds', () => {
    const parts = formatTimeParts(new Date('2026-09-27T10:05:07'), '24h');
    expect(parts).toEqual({ hours: '10', minutes: '05', seconds: '07', ampm: null });
  });

  it('keeps hours zero-padded in 24-hour mode', () => {
    const parts = formatTimeParts(new Date('2026-09-27T00:30:00'), '24h');
    expect(parts).toEqual({ hours: '00', minutes: '30', seconds: '00', ampm: null });
  });

  it('renders 12-hour format with AM/PM and 12-hour rollover', () => {
    expect(formatTimeParts(new Date('2026-09-27T00:15:00'), '12h')).toEqual({
      hours: '12',
      minutes: '15',
      seconds: '00',
      ampm: 'AM',
    });
    expect(formatTimeParts(new Date('2026-09-27T11:59:59'), '12h')).toEqual({
      hours: '11',
      minutes: '59',
      seconds: '59',
      ampm: 'AM',
    });
    expect(formatTimeParts(new Date('2026-09-27T12:00:00'), '12h')).toEqual({
      hours: '12',
      minutes: '00',
      seconds: '00',
      ampm: 'PM',
    });
    expect(formatTimeParts(new Date('2026-09-27T13:45:30'), '12h')).toEqual({
      hours: '01',
      minutes: '45',
      seconds: '30',
      ampm: 'PM',
    });
    expect(formatTimeParts(new Date('2026-09-27T23:01:02'), '12h')).toEqual({
      hours: '11',
      minutes: '01',
      seconds: '02',
      ampm: 'PM',
    });
  });

  it('does not mutate its input date', () => {
    const date = new Date('2026-09-27T10:15:30');
    formatTimeParts(date, '24h');
    expect(date).toEqual(new Date('2026-09-27T10:15:30'));
  });
});

describe('getTimeFormat', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to 24-hour when nothing is stored', () => {
    expect(getTimeFormat()).toBe('24h');
  });

  it('falls back to 24-hour for an invalid stored value', () => {
    localStorage.setItem(STORAGE_KEY, '15h');
    expect(getTimeFormat()).toBe('24h');
  });

  it('returns the stored 12-hour preference', () => {
    localStorage.setItem(STORAGE_KEY, '12h');
    expect(getTimeFormat()).toBe('12h');
  });

  it('uses the supplied fallback when nothing is stored', () => {
    expect(getTimeFormat('12h')).toBe('12h');
  });

  it('uses the supplied fallback for an invalid stored value', () => {
    localStorage.setItem(STORAGE_KEY, '15h');
    expect(getTimeFormat('12h')).toBe('12h');
  });

  it('prefers a valid stored value over the supplied fallback', () => {
    localStorage.setItem(STORAGE_KEY, '12h');
    expect(getTimeFormat('24h')).toBe('12h');
  });
});

describe('setTimeFormat', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists the chosen format', () => {
    setTimeFormat('12h');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('12h');
    expect(getTimeFormat()).toBe('12h');
  });

  it('round-trips both formats', () => {
    const formats: TimeFormat[] = ['24h', '12h'];
    for (const format of formats) {
      setTimeFormat(format);
      expect(getTimeFormat()).toBe(format);
    }
  });
});
