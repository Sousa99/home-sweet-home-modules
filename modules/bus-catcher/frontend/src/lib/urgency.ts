import type { DepartureThresholds } from '../api/types';

/** Documented default departure thresholds (minutes before arrival). */
export const DEFAULT_THRESHOLDS: DepartureThresholds = {
  headsUpMinutes: 10,
  leaveNowMinutes: 5,
  missedMinutes: 1,
};

export type UrgencyLevel = 'relaxed' | 'heads-up' | 'leave-now' | 'missed';

/** Resolve partial thresholds over the documented defaults. */
export function resolveThresholds(partial?: Partial<DepartureThresholds>): DepartureThresholds {
  return { ...DEFAULT_THRESHOLDS, ...partial };
}

/**
 * Derive the urgency level for a bus from its remaining minutes and the
 * stop's thresholds. Strictest-first, at-or-below (`<=`) semantics, so a bus
 * exactly at a threshold minutes value gets the stricter level and a bus at
 * or below the missed threshold (including 0/negative) is always missed.
 */
export function urgencyLevel(minutesUntil: number, thresholds: DepartureThresholds): UrgencyLevel {
  if (minutesUntil <= thresholds.missedMinutes) return 'missed';
  if (minutesUntil <= thresholds.leaveNowMinutes) return 'leave-now';
  if (minutesUntil <= thresholds.headsUpMinutes) return 'heads-up';
  return 'relaxed';
}

/** Tailwind hue for a level's dot. Sole indicator (no text label). */
export function urgencyDotClass(level: UrgencyLevel): string {
  switch (level) {
    case 'missed':
      return 'bg-slate-900';
    case 'leave-now':
      return 'bg-orange-500';
    case 'heads-up':
      return 'bg-amber-500';
    case 'relaxed':
      return 'bg-green-500';
  }
}
