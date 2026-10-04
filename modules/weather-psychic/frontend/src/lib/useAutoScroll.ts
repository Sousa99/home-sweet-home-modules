import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

export interface UseAutoScrollOptions {
  /** Pixels scrolled per second (smooth, frame-driven). */
  speedPxPerSecond?: number;
  /** Pause in ms at the end of the strip before resetting to the left. */
  resetPauseMs?: number;
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const DEFAULT_SPEED = 30;
const DEFAULT_PAUSE = 1500;

/**
 * Auto-scroll a horizontal overflow container smoothly and continuously.
 *
 * A `requestAnimationFrame` loop advances `scrollLeft` by `speedPxPerSecond`
 * (so the motion is smooth, not stepped). When the end of the scrollable area
 * is reached the strip pauses for `resetPauseMs`, then snaps back to the left
 * and keeps scrolling — a continuous loop. When the user prefers reduced
 * motion, no scrolling happens at all.
 *
 * The caller attaches `ref` to the scrolling element.
 */
export function useAutoScroll<T extends HTMLElement>({
  speedPxPerSecond = DEFAULT_SPEED,
  resetPauseMs = DEFAULT_PAUSE,
}: UseAutoScrollOptions = {}): { ref: RefObject<T | null> } {
  const ref = useRef<T | null>(null);
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    const mql = window.matchMedia(REDUCED_MOTION_QUERY);
    prefersReducedMotion.current = mql.matches;
    const onChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion.current = e.matches;
    };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    let rafId = 0;
    let lastTime: number | null = null;
    let pausedUntil = 0;
    let needsReset = false;

    const frame = (time: number) => {
      const el = ref.current;
      if (el === null || prefersReducedMotion.current) {
        rafId = requestAnimationFrame(frame);
        return;
      }
      const maxScrollLeft = el.scrollWidth - el.clientWidth;
      if (maxScrollLeft <= 0) {
        rafId = requestAnimationFrame(frame);
        return;
      }

      // While paused at the end, hold position; when the pause elapses, snap
      // back to the left and resume the loop.
      if (needsReset) {
        if (time < pausedUntil) {
          rafId = requestAnimationFrame(frame);
          return;
        }
        el.scrollLeft = 0;
        needsReset = false;
        lastTime = time;
        rafId = requestAnimationFrame(frame);
        return;
      }

      if (lastTime === null) {
        lastTime = time;
        rafId = requestAnimationFrame(frame);
        return;
      }

      const dtMs = time - lastTime;
      lastTime = time;
      const delta = (speedPxPerSecond * dtMs) / 1000;
      const next = el.scrollLeft + delta;

      if (next >= maxScrollLeft) {
        el.scrollLeft = maxScrollLeft;
        needsReset = true;
        pausedUntil = time + resetPauseMs;
        lastTime = null;
      } else {
        el.scrollLeft = next;
      }
      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [speedPxPerSecond, resetPauseMs]);

  return { ref };
}
