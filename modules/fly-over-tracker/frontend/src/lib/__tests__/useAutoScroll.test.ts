import { act, fireEvent, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutoScroll } from '../useAutoScroll';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

type ChangeListener = (event: { matches: boolean; media: string }) => void;

function mockMatchMedia(reduce: boolean) {
  const listeners = new Set<ChangeListener>();
  const mql = {
    matches: reduce,
    media: REDUCED_MOTION_QUERY,
    addEventListener: (_type: string, cb: ChangeListener) => {
      listeners.add(cb);
    },
    removeEventListener: (_type: string, cb: ChangeListener) => {
      listeners.delete(cb);
    },
    addListener: () => undefined,
    removeListener: () => undefined,
    onchange: null,
    dispatchEvent: () => true,
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({ ...mql, media: query })),
  );
  return {
    /** Flip the reduced-motion preference and notify the hook's listener. */
    toggleTo(value: boolean) {
      for (const listener of [...listeners]) {
        listener({ matches: value, media: REDUCED_MOTION_QUERY });
      }
    },
  };
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
    /** Number of scheduled-but-not-yet-run callbacks. */
    pending() {
      return queue.length;
    },
  };
}

function makeElement(scrollHeight = 600, clientHeight = 300): HTMLElement {
  const el = document.createElement('div');
  Object.defineProperty(el, 'scrollHeight', { configurable: true, value: scrollHeight });
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: clientHeight });
  el.scrollTop = 0;
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
  it('advances scrollTop smoothly toward the end', () => {
    mockMatchMedia(false);
    const driver = createRafDriver();
    const el = makeElement(2000, 300); // max scrollTop = 1700 (never reached here)
    const { result } = renderHook(() => useAutoScroll({ speedPxPerSecond: 1000 }));
    act(() => {
      result.current.ref.current = el;
    });

    act(() => {
      driver.frames(10);
    });
    // ~16px/frame at 1000px/s; after 10 frames it has moved a little but far
    // from the 1700px max — smooth, not a single jump to the end.
    expect(el.scrollTop).toBeGreaterThan(0);
    expect(el.scrollTop).toBeLessThan(1700);

    act(() => {
      driver.frames(20);
    });
    const progressed = el.scrollTop;
    expect(progressed).toBeGreaterThan(100);

    act(() => {
      driver.frames(20);
    });
    expect(el.scrollTop).toBeGreaterThan(progressed);
  });

  it('pauses at the end, then resets to the top and keeps scrolling', () => {
    mockMatchMedia(false);
    const driver = createRafDriver();
    const el = makeElement(400, 300); // max scrollTop = 100
    const { result } = renderHook(() =>
      useAutoScroll({ speedPxPerSecond: 1000, resetPauseMs: 200 }),
    );
    act(() => {
      result.current.ref.current = el;
    });

    // Advance until pinned at the end.
    let guard = 0;
    act(() => {
      while (el.scrollTop < 100 && guard < 200) {
        driver.frame();
        guard += 1;
      }
    });
    expect(el.scrollTop).toBe(100);

    // Still paused shortly after reaching the end.
    act(() => {
      driver.frames(8);
    });
    expect(el.scrollTop).toBe(100);

    // Past the pause: reset to the top.
    act(() => {
      while (el.scrollTop === 100 && guard < 400) {
        driver.frame();
        guard += 1;
      }
    });
    expect(el.scrollTop).toBe(0);

    // And it keeps scrolling again.
    act(() => {
      driver.frames(4);
    });
    expect(el.scrollTop).toBeGreaterThan(0);
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
    expect(el.scrollTop).toBe(0);
  });

  it('stops immediately when reduced motion is enabled mid-scroll', () => {
    const motion = mockMatchMedia(false);
    const driver = createRafDriver();
    const el = makeElement(2000, 300); // max scrollTop = 1700
    const { result } = renderHook(() => useAutoScroll({ speedPxPerSecond: 1000 }));
    act(() => {
      result.current.ref.current = el;
    });

    act(() => {
      driver.frames(5);
    });
    const stoppedAt = el.scrollTop;
    expect(stoppedAt).toBeGreaterThan(0);

    act(() => {
      motion.toggleTo(true);
      driver.frames(50);
    });
    expect(el.scrollTop).toBe(stoppedAt); // stopped mid-scroll, position held
  });

  it('pauses on pointer enter and resumes on pointer leave', () => {
    mockMatchMedia(false);
    const driver = createRafDriver();
    const el = makeElement(2000, 300); // max scrollTop = 1700 (never reached here)
    const { result } = renderHook(() => useAutoScroll({ speedPxPerSecond: 1000 }));
    act(() => {
      result.current.ref.current = el;
    });

    act(() => {
      driver.frames(5);
    });
    const beforeHover = el.scrollTop;
    expect(beforeHover).toBeGreaterThan(0);

    // Hover holds the position exactly, no matter how many frames pass.
    act(() => {
      fireEvent.pointerEnter(el);
      driver.frames(10);
    });
    expect(el.scrollTop).toBe(beforeHover);

    // Leaving resumes the glide.
    act(() => {
      fireEvent.pointerLeave(el);
      driver.frames(1);
    });
    act(() => {
      driver.frames(5);
    });
    expect(el.scrollTop).toBeGreaterThan(beforeHover);
  });

  it('starts scrolling when the list appears after mounting without one', () => {
    mockMatchMedia(false);
    const driver = createRafDriver();
    const { result } = renderHook(() => useAutoScroll({ speedPxPerSecond: 1000 }));

    // No element yet (loading): the loop stays alive but nothing moves.
    act(() => {
      driver.frames(5);
    });

    const el = makeElement(2000, 300);
    act(() => {
      result.current.ref.current = el;
    });

    act(() => {
      driver.frames(5);
    });
    expect(el.scrollTop).toBeGreaterThan(0);
  });

  it('clears a stale hover when the list element is replaced', () => {
    mockMatchMedia(false);
    const driver = createRafDriver();
    const first = makeElement(2000, 300);
    const { result } = renderHook(() => useAutoScroll({ speedPxPerSecond: 1000 }));
    act(() => {
      result.current.ref.current = first;
    });

    act(() => {
      driver.frames(2);
    });

    // Hover the first element, then replace it (as a remount would).
    const replacement = makeElement(2000, 300);
    act(() => {
      fireEvent.pointerEnter(first);
      result.current.ref.current = replacement;
    });

    // A remounted list must not inherit the stale hover and stay paused.
    act(() => {
      driver.frames(5);
    });
    expect(replacement.scrollTop).toBeGreaterThan(0);
  });

  it('stops the animation on unmount', () => {
    mockMatchMedia(false);
    const driver = createRafDriver();
    const cancelSpy = vi.spyOn(globalThis, 'cancelAnimationFrame');
    const el = makeElement(2000, 300);
    const { result, unmount } = renderHook(() => useAutoScroll({ speedPxPerSecond: 1000 }));
    act(() => {
      result.current.ref.current = el;
    });

    act(() => {
      driver.frames(5);
    });
    const stoppedAt = el.scrollTop;
    expect(stoppedAt).toBeGreaterThan(0);

    unmount();
    expect(cancelSpy).toHaveBeenCalled();
    expect(driver.pending()).toBe(0); // no callback left to run

    act(() => {
      driver.frames(5);
    });
    expect(el.scrollTop).toBe(stoppedAt);
  });

  it('glides at the 25 px/s default, slower than the weather strip’s 45 px/s', () => {
    mockMatchMedia(false);
    const driver = createRafDriver();
    const el = makeElement(5000, 300); // max scrollTop = 4700 (never reached)
    const { result } = renderHook(() => useAutoScroll()); // default options
    act(() => {
      result.current.ref.current = el;
    });

    // 1 priming frame sets the clock, then 100 frames of motion = 1.6s.
    const movingFrames = 100;
    const seconds = (movingFrames * 16) / 1000;
    act(() => {
      driver.frames(movingFrames + 1);
    });

    // ~25 px/s default: 25 * 1.6s ≈ 40px …
    expect(el.scrollTop).toBeCloseTo(25 * seconds, 5);
    // … and clearly below what the weather strip's 45 px/s would produce.
    expect(el.scrollTop).toBeLessThan(45 * seconds);
  });
});
