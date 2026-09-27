import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCurrentTime } from '../src/lib/useCurrentTime';

describe('useCurrentTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-27T10:15:30'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the current time on mount', () => {
    const { result } = renderHook(() => useCurrentTime());
    expect(result.current).toEqual(new Date('2026-09-27T10:15:30'));
  });

  it('updates the returned time once per second', () => {
    const { result } = renderHook(() => useCurrentTime());
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toEqual(new Date('2026-09-27T10:15:31'));
  });

  it('crosses minute and hour boundaries', () => {
    const { result } = renderHook(() => useCurrentTime());
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current).toEqual(new Date('2026-09-27T10:16:30'));
    act(() => {
      vi.advanceTimersByTime(3_600_000);
    });
    expect(result.current).toEqual(new Date('2026-09-27T11:16:30'));
  });

  it('resyncs when the document regains visibility', () => {
    const { result } = renderHook(() => useCurrentTime());
    act(() => {
      vi.setSystemTime(new Date('2026-09-27T12:00:00'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current).toEqual(new Date('2026-09-27T12:00:00'));
  });

  it('resyncs on window focus', () => {
    const { result } = renderHook(() => useCurrentTime());
    act(() => {
      vi.setSystemTime(new Date('2026-09-27T12:00:01'));
      window.dispatchEvent(new Event('focus'));
    });
    expect(result.current).toEqual(new Date('2026-09-27T12:00:01'));
  });

  it('stops updating after unmount', () => {
    const { result, unmount } = renderHook(() => useCurrentTime());
    unmount();
    const frozen = result.current;
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current).toEqual(frozen);
  });
});
