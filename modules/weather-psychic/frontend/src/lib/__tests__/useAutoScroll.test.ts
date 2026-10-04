import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutoScroll } from '../useAutoScroll';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function mockMatchMedia(reduce: boolean) {
  const listeners = new Set<(e: MediaQueryListEvent) => void>();
  const mql = {
    matches: reduce,
    media: REDUCED_MOTION_QUERY,
    addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.delete(cb),
    addListener: (_: unknown) => undefined,
    removeListener: (_: unknown) => undefined,
    onchange: null,
    dispatchEvent: () => true,
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({ ...mql, media: query })),
  );
  return { listeners };
}

function makeElement(scrollWidth = 600, clientWidth = 300): HTMLElement {
  const el = document.createElement('div');
  Object.defineProperty(el, 'scrollWidth', { configurable: true, value: scrollWidth });
  Object.defineProperty(el, 'clientWidth', { configurable: true, value: clientWidth });
  el.scrollLeft = 0;
  return el;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useAutoScroll', () => {
  it('returns a ref and advances scrollLeft on an interval', () => {
    mockMatchMedia(false);
    const el = makeElement();
    const { result } = renderHook(() => useAutoScroll({ intervalMs: 1000, stepPx: 80 }));

    act(() => {
      result.current.ref.current = el;
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(el.scrollLeft).toBe(80);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(el.scrollLeft).toBe(160);
  });

  it('stops advancing when the end of the scrollable area is reached', () => {
    mockMatchMedia(false);
    const el = makeElement(620, 300);
    const { result } = renderHook(() => useAutoScroll({ intervalMs: 1000, stepPx: 100 }));

    act(() => {
      result.current.ref.current = el;
    });

    // 300 + 100 + 100 = 500 < 620 → keeps advancing; 500 + 100 = 600 > 620-? clamp
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(el.scrollLeft).toBe(200);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    // Reached the end: scrollLeft must not exceed the max (scrollWidth - clientWidth).
    const max = el.scrollWidth - el.clientWidth;
    expect(el.scrollLeft).toBeLessThanOrEqual(max);

    const frozen = el.scrollLeft;
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(el.scrollLeft).toBe(frozen);
  });

  it('does not scroll when prefers-reduced-motion is set', () => {
    mockMatchMedia(true);
    const el = makeElement();
    const { result } = renderHook(() => useAutoScroll({ intervalMs: 1000, stepPx: 80 }));

    act(() => {
      result.current.ref.current = el;
    });
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(el.scrollLeft).toBe(0);
  });
});
