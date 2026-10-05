import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

export interface UseAutoScrollOptions {
  /** Pixels scrolled per second (smooth, frame-driven). */
  speedPxPerSecond?: number;
  /** Pause in ms at the end of the list before resetting to the top. */
  resetPauseMs?: number;
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const DEFAULT_SPEED = 25;
const DEFAULT_PAUSE = 2000;

/**
 * Auto-scroll a vertical overflow container smoothly and continuously.
 *
 * A `requestAnimationFrame` loop advances `scrollTop` by `speedPxPerSecond`
 * (so the motion is smooth, not stepped). When the end of the scrollable area
 * is reached the list pauses for `resetPauseMs`, then snaps back to the top and
 * keeps scrolling — a continuous loop. While the pointer is over the container
 * the animation holds position (so manual scrolling stays possible) and resumes
 * on pointer leave. When the user prefers reduced motion, no scrolling happens
 * at all and any mid-scroll motion stops immediately.
 *
 * The caller attaches `ref` to the scrolling element.
 */
export function useAutoScroll<T extends HTMLElement>({
  speedPxPerSecond = DEFAULT_SPEED,
  resetPauseMs = DEFAULT_PAUSE,
}: UseAutoScrollOptions = {}): { ref: RefObject<T | null> } {
  const ref = useRef<T | null>(null);
  const prefersReducedMotion = useRef(false);
  const isHovered = useRef(false);

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
    // Under reduced motion, never start the loop at all.
    if (prefersReducedMotion.current) return undefined;

    let rafId = 0;
    let lastTime: number | null = null;
    let pausedUntil = 0;
    let needsReset = false;
    let elWithListeners: T | null = null;
    // Authoritative fractional scroll offset. We must not read `el.scrollTop`
    // back each frame to advance: browsers quantize it to whole device pixels,
    // so a sub-pixel increment (~0.4px at 25px/s / 60fps) can round back to the
    // previous value and the list never moves. Accumulating here and assigning
    // a monotonically growing value lets the browser eventually land on whole
    // pixels. It is re-synced from the element whenever motion (re)starts or
    // after a manual/hover pause.
    let position = 0;

    const onPointerEnter = () => {
      isHovered.current = true;
    };
    const onPointerLeave = () => {
      isHovered.current = false;
    };

    // Drop the current element's listeners, if any.
    const detachElement = () => {
      if (elWithListeners === null) return;
      elWithListeners.removeEventListener('pointerenter', onPointerEnter);
      elWithListeners.removeEventListener('pointerleave', onPointerLeave);
      elWithListeners = null;
    };

    // Reset per-element state so a remounting list starts clean: no stale hover
    // (which would keep it paused) and no stale clock (which would jump by the
    // idle gap on the next frame).
    const resetElement = () => {
      detachElement();
      isHovered.current = false;
      lastTime = null;
    };

    const frame = (time: number) => {
      const el = ref.current;
      // Guard re-checks the flag so a mid-scroll preference change stops motion.
      if (prefersReducedMotion.current) return;
      if (el === null) {
        // The scrolling element may render later (loading → data); keep the
        // loop alive so scrolling starts as soon as the list exists.
        resetElement();
        rafId = requestAnimationFrame(frame);
        return;
      }
      if (elWithListeners !== el) {
        // Mounted or replaced (e.g. loading → data): re-attach listeners to the
        // new element after clearing the previous one's state.
        resetElement();
        el.addEventListener('pointerenter', onPointerEnter);
        el.addEventListener('pointerleave', onPointerLeave);
        elWithListeners = el;
      }

      const maxScrollTop = el.scrollHeight - el.clientHeight;
      if (maxScrollTop <= 0) {
        // Nothing overflows yet; keep the loop alive so scrolling starts as
        // soon as the list outgrows its container. Keep the fractional offset
        // in sync so a later overflow starts cleanly.
        position = el.scrollTop;
        rafId = requestAnimationFrame(frame);
        return;
      }

      // While the pointer is over the list, hold the position (manual scrolling
      // wins); resume without a jump once the pointer leaves.
      if (isHovered.current) {
        position = el.scrollTop;
        lastTime = null;
        rafId = requestAnimationFrame(frame);
        return;
      }

      // While paused at the end, hold position; when the pause elapses, snap
      // back to the top and resume the loop.
      if (needsReset) {
        if (time < pausedUntil) {
          rafId = requestAnimationFrame(frame);
          return;
        }
        position = 0;
        el.scrollTop = 0;
        needsReset = false;
        lastTime = time;
        rafId = requestAnimationFrame(frame);
        return;
      }

      if (lastTime === null) {
        // Re-sync with the element (e.g. a user manually scrolled) before
        // resuming motion.
        position = el.scrollTop;
        lastTime = time;
        rafId = requestAnimationFrame(frame);
        return;
      }

      const dtMs = time - lastTime;
      lastTime = time;
      const delta = (speedPxPerSecond * dtMs) / 1000;
      position += delta;

      if (position >= maxScrollTop) {
        position = maxScrollTop;
        el.scrollTop = maxScrollTop;
        needsReset = true;
        pausedUntil = time + resetPauseMs;
        lastTime = null;
      } else {
        el.scrollTop = position;
      }
      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafId);
      detachElement();
    };
  }, [speedPxPerSecond, resetPauseMs]);

  return { ref };
}
