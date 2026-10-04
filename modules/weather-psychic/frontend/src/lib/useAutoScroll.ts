import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

export interface UseAutoScrollOptions {
  /** Milliseconds between each scroll advance. */
  intervalMs?: number;
  /** Pixels scrolled per advance. */
  stepPx?: number;
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Auto-scroll a horizontal overflow container to the right on an interval.
 *
 * Advances the element's `scrollLeft` by `stepPx` every `intervalMs`, stopping
 * once the end of the scrollable area is reached. When the user prefers reduced
 * motion, no scrolling happens at all.
 *
 * The caller attaches `ref` to the scrolling element.
 */
export function useAutoScroll<T extends HTMLElement>({
  intervalMs = 1000,
  stepPx = 80,
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
    const id = setInterval(() => {
      const el = ref.current;
      if (el === null || prefersReducedMotion.current) return;
      const maxScrollLeft = el.scrollWidth - el.clientWidth;
      const next = Math.min(el.scrollLeft + stepPx, maxScrollLeft);
      if (next <= el.scrollLeft) return; // at the end; stop advancing
      el.scrollLeft = next;
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, stepPx]);

  return { ref };
}
