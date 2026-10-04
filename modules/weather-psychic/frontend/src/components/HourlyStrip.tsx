import type { JSX } from 'react';
import type { HourlyEntry } from '../api/types';
import { iconForWeather } from '../lib/conditions';
import { formatHour, formatPercent, formatTemperature } from '../lib/format';
import { useAutoScroll } from '../lib/useAutoScroll';

export interface HourlyStripProps {
  /** Hourly forecast entries (ascending by time). */
  hourly: HourlyEntry[];
  /** Current time used to exclude the current hour from the strip. */
  now?: string;
  /** Smooth scroll speed in pixels per second. */
  speedPxPerSecond?: number;
  /** Pause in ms at the end before resetting to the left. */
  resetPauseMs?: number;
}

/**
 * The auto-scrolling hourly forecast strip: a horizontal, overflow-x container
 * that scrolls smoothly to the right, pauses at the end, then resets to the
 * left and loops (respecting reduced motion). The current hour is always
 * excluded — the strip shows the coming hours only.
 */
export function HourlyStrip({
  hourly,
  now,
  speedPxPerSecond = 45,
  resetPauseMs = 1500,
}: HourlyStripProps): JSX.Element {
  const { ref } = useAutoScroll<HTMLDivElement>({ speedPxPerSecond, resetPauseMs });

  const currentHour = now !== undefined ? now.slice(0, 13) : null;
  const entries = hourly.filter(
    (entry) => currentHour === null || entry.time.slice(0, 13) !== currentHour,
  );

  if (entries.length === 0) {
    return <p className="py-4 text-center text-sm text-slate-500">No hourly forecast available.</p>;
  }

  return (
    <div
      ref={ref}
      data-testid="hourly-strip"
      className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]"
    >
      {entries.map((entry) => (
        <div
          key={entry.time}
          className="flex w-16 shrink-0 flex-col items-center gap-1 rounded-lg border border-slate-100 bg-slate-50/60 px-2 py-2"
        >
          <span className="text-xs text-slate-500">{formatHour(entry.time)}</span>
          <span aria-hidden="true" className="text-lg text-amber-600">
            {ICON_GLYPH[iconForWeather(entry.weatherCode, entry.isDay)] ?? '?'}
          </span>
          <span className="text-sm font-medium text-slate-700">
            {formatTemperature(entry.temperature)}
          </span>
          <span className="text-[10px] text-slate-400">
            {formatPercent(entry.precipitationProbability)}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Minimal emoji-free glyph set for weather icons (kept dependency-free). */
const ICON_GLYPH: Record<string, string> = {
  'clear-day': '☀',
  'clear-night': '☾',
  'partly-cloudy': '⛅',
  overcast: '☁',
  fog: '≋',
  drizzle: '🌦',
  rain: '🌧',
  snow: '❄',
  thunderstorm: '⛈',
  unknown: '?',
};
