import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useClockFormat } from '../src/lib/useClockFormat';

describe('useClockFormat', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('uses defaultFormat when nothing is stored and switchable', () => {
    const { result } = renderHook(() => useClockFormat({ defaultFormat: '12h', switchable: true }));
    expect(result.current.format).toBe('12h');
  });

  it('uses the stored value when switchable and valid', () => {
    localStorage.setItem('current-time:time-format', '12h');
    const { result } = renderHook(() => useClockFormat({ defaultFormat: '24h', switchable: true }));
    expect(result.current.format).toBe('12h');
  });

  it('pins defaultFormat when not switchable, ignoring storage', () => {
    localStorage.setItem('current-time:time-format', '12h');
    const { result } = renderHook(() =>
      useClockFormat({ defaultFormat: '24h', switchable: false }),
    );
    expect(result.current.format).toBe('24h');
  });

  it('persists the new format when switchable', () => {
    const { result } = renderHook(() => useClockFormat({ defaultFormat: '24h', switchable: true }));
    act(() => result.current.setFormat('12h'));
    expect(result.current.format).toBe('12h');
    expect(localStorage.getItem('current-time:time-format')).toBe('12h');
  });

  it('does not persist the new format when not switchable', () => {
    const { result } = renderHook(() =>
      useClockFormat({ defaultFormat: '24h', switchable: false }),
    );
    act(() => result.current.setFormat('12h'));
    expect(result.current.format).toBe('12h');
    expect(localStorage.getItem('current-time:time-format')).toBeNull();
  });
});
