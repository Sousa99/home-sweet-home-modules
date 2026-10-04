import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutoScroll } from '../useAutoScroll';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function mockMatchMedia(reduce: boolean) {
  const mql = {
    matches: reduce,
    media: REDUCED_MOTION_QUERY,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    onchange: null,
    dispatchEvent: () => true,
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({ ...mql, media: query })),
  );
}

/**
 * Deterministic requestAnimationFrame driver: frames advance by 16ms (like the
 * browser's typical cadence) and callbacks receive the cumulative clock, so the
 * smooth-scroll loop can be stepped through frame by frame.
 */
function createRafDriver() {
  let now = 0;
  let nextId = 1;
  const queue: Array<{ id: number; cb: FrameRequestCallback }> = [];

  vi.stubGlobal('requestAnimationFrame', ((cb: FrameRequestCallback) => {
    queue.push({ id: nextId, cb });
    return nextId++;
  }) as typeof requestAnimationFrame);
  vi.stubGlobal('cancelAnimationFrame', ((id: number) => {
    const idx = queue.findIndex((f) => f.id === id);
    if (idx >= 0) queue.splice(idx, 1);
  }) as typeof cancelAnimationFrame);

  return {
    /** Run a single 16ms frame. */
    frame() {
      now += 16;
      const batch = [...queue];
      queue.length = 0;
      for (const f of batch) f.cb(now);
    },
    /** Run `n` frames. */
    frames(n: number) {
      for (let i = 0; i < n; i += 1) this.frame();
    },
  };
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
  it('advances scrollLeft smoothly toward the end', () => {
    mockMatchMedia(false);
    const driver = createRafDriver();
    const el = makeElement(2000, 300); // max scrollLeft = 1700 (never reached here)
    const { result } = renderHook(() => useAutoScroll({ speedPxPerSecond: 1000 }));
    act(() => {
      result.current.ref.current = el;
    });

    act(() => {
      driver.frames(10);
    });
    // ~16px/frame at 1000px/s; after 10 frames it has moved a little but far
    // from the 1700px max — smooth, not a single jump to the end.
    expect(el.scrollLeft).toBeGreaterThan(0);
    expect(el.scrollLeft).toBeLessThan(1700);

    act(() => {
      driver.frames(20);
    });
    const progressed = el.scrollLeft;
    expect(progressed).toBeGreaterThan(100);

    act(() => {
      driver.frames(20);
    });
    expect(el.scrollLeft).toBeGreaterThan(progressed);
  });

  it('pauses at the end, then resets to the left and keeps scrolling', () => {
    mockMatchMedia(false);
    const driver = createRafDriver();
    const el = makeElement(400, 300); // max scrollLeft = 100
    const { result } = renderHook(() =>
      useAutoScroll({ speedPxPerSecond: 1000, resetPauseMs: 200 }),
    );
    act(() => {
      result.current.ref.current = el;
    });

    // Advance until pinned at the end.
    let guard = 0;
    act(() => {
      while (el.scrollLeft < 100 && guard < 200) {
        driver.frame();
        guard += 1;
      }
    });
    expect(el.scrollLeft).toBe(100);

    // Still paused shortly after reaching the end.
    act(() => {
      driver.frames(8);
    });
    expect(el.scrollLeft).toBe(100);

    // Past the pause: reset to the left.
    act(() => {
      while (el.scrollLeft === 100 && guard < 400) {
        driver.frame();
        guard += 1;
      }
    });
    expect(el.scrollLeft).toBe(0);

    // And it keeps scrolling again.
    act(() => {
      driver.frames(4);
    });
    expect(el.scrollLeft).toBeGreaterThan(0);
  });

  it('does not scroll when prefers-reduced-motion is set', () => {
    mockMatchMedia(true);
    const driver = createRafDriver();
    const el = makeElement();
    const { result } = renderHook(() => useAutoScroll({ speedPxPerSecond: 1000 }));
    act(() => {
      result.current.ref.current = el;
    });

    act(() => {
      driver.frames(100);
    });
    expect(el.scrollLeft).toBe(0);
  });
});
