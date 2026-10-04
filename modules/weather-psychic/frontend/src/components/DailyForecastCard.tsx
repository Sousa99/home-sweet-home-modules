import { useCallback, useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';
import { WidgetStatusBar } from '@sousa99/homesweethome-components';
import { getForecast } from '../api/client';
import type { DailyEntry, Forecast, Location } from '../api/types';
import { iconForWeather } from '../lib/conditions';
import { formatDay, formatLowHigh, formatPercent } from '../lib/format';
import { cn } from '../lib/utils';
import { Card } from './ui/card';

/** The forecast-fetching capability, injectable for tests and Storybook. */
export type FetchForecast = (input: { location: Location }) => Promise<Forecast>;

export interface DailyForecastCardProps {
  /** The place whose daily forecast is shown. */
  location: Location;
  /** Injectable data fetcher (Storybook fixtures / tests). Defaults to the API client. */
  fetchForecast?: FetchForecast;
  /** Base URL of the module backend (base-url contract); `''` = same-origin `/api`. */
  baseUrl?: string;
  /** Auto-refresh cadence in ms; `0` disables. */
  refetchIntervalMs?: number;
  /** Maximum number of days to list. */
  maxDays?: number;
  /** Current time (ISO) used to determine "today"; defaults to the device clock. */
  now?: string;
  /** Extra classes applied to the widget root. */
  className?: string;
}

interface LoadState {
  data: Forecast | null;
  error: string | null;
  lastUpdatedAt: number | null;
  updating: boolean;
}

const IDLE: LoadState = { data: null, error: null, lastUpdatedAt: null, updating: false };

function buildDefaultFetcher(baseUrl: string): FetchForecast {
  return ({ location }) =>
    getForecast({ lat: location.latitude, lng: location.longitude }, baseUrl);
}

/**
 * Widget 2 of weather-psychic: a compact, succinct list of the upcoming days'
 * weather for a configurable location, with the standardized `WidgetStatusBar`
 * on top. The current day is always excluded (defensive even though the
 * backend already excludes it) so the list starts tomorrow. Self-fetches
 * through the API client (or an injected fetcher) and keeps last-known data on
 * error.
 */
export const DailyForecastCard = ({
  location,
  fetchForecast,
  baseUrl = '',
  refetchIntervalMs = 900_000,
  maxDays = 5,
  now,
  className,
}: DailyForecastCardProps): JSX.Element => {
  const fetcherRef = useRef<FetchForecast | null>(null);
  if (fetcherRef.current === null) {
    fetcherRef.current = fetchForecast ?? buildDefaultFetcher(baseUrl);
  }

  const [state, setState] = useState<LoadState>(IDLE);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const fetcher = fetcherRef.current;
    if (fetcher === null) return;
    const requestId = ++requestIdRef.current;
    setState((prev) => ({ ...prev, updating: true }));
    try {
      const data = await fetcher({ location });
      if (requestId !== requestIdRef.current) return; // stale: a newer request superseded this
      setState({ data, error: null, lastUpdatedAt: Date.now(), updating: false });
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Something went wrong.',
        updating: false,
      }));
    }
  }, [location]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (refetchIntervalMs <= 0) return undefined;
    intervalRef.current = setInterval(() => void load(), refetchIntervalMs);
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, [load, refetchIntervalMs]);

  const { data, error, lastUpdatedAt, updating } = state;

  // Prefer the forecast's own localized timestamp (the backend localizes the
  // current conditions); fall back to the injected `now` or the device clock.
  const reference = data?.current?.time ?? now ?? new Date().toISOString();
  const today = reference.slice(0, 10);
  const days: DailyEntry[] = (data?.daily ?? [])
    .filter((entry) => entry.date > today)
    .slice(0, maxDays);

  return (
    <div className={cn('flex h-full w-full flex-col', className)}>
      <div className="pb-2">
        <WidgetStatusBar
          lastUpdatedAt={lastUpdatedAt}
          updating={updating}
          error={error}
          onRefresh={() => void load()}
        />
      </div>

      <Card data-testid="daily-forecast-card" className="min-h-0 flex-1">
        <h2 className="mt-3 mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Daily forecast
        </h2>

        {data === null && !error && (
          <p className="py-6 text-center text-sm text-slate-500">Loading forecast…</p>
        )}

        {data !== null && days.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-500">No upcoming days available.</p>
        )}

        {days.length > 0 && (
          <ul className="space-y-1">
            {days.map((entry) => (
              <li
                key={entry.date}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2"
              >
                <span className="w-24 shrink-0 text-sm font-medium text-slate-700">
                  {formatDay(entry.date)}
                </span>
                <span className="flex items-center gap-1.5 text-sm text-slate-600">
                  <span aria-hidden="true" className="text-amber-600">
                    {ICON_GLYPH[iconForWeather(entry.weatherCode, true)] ?? '?'}
                  </span>
                  {entry.condition}
                </span>
                <span className="shrink-0 text-xs text-slate-400">
                  {formatPercent(entry.precipitationProbability)}
                </span>
                <span className="shrink-0 text-sm font-medium text-slate-700">
                  {formatLowHigh(entry.temperatureMin, entry.temperatureMax)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

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
