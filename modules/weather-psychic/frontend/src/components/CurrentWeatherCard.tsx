import { useCallback, useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';
import { WidgetStatusBar } from '@sousa99/homesweethome-components';
import { getForecast } from '../api/client';
import type { Forecast, Location } from '../api/types';
import { iconForWeather } from '../lib/conditions';
import { formatHour, formatPercent, formatTemperature } from '../lib/format';
import { cn } from '../lib/utils';
import { Card } from './ui/card';
import { HourlyStrip } from './HourlyStrip';

/** The forecast-fetching capability, injectable for tests and Storybook. */
export type FetchForecast = (input: { location: Location }) => Promise<Forecast>;

export interface CurrentWeatherCardProps {
  /** The place whose current + hourly weather is shown. */
  location: Location;
  /** Injectable data fetcher (Storybook fixtures / tests). Defaults to the API client. */
  fetchForecast?: FetchForecast;
  /** Base URL of the module backend (base-url contract); `''` = same-origin `/api`. */
  baseUrl?: string;
  /** Auto-refresh cadence in ms; `0` disables. */
  refetchIntervalMs?: number;
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
 * Widget 1 of weather-psychic: the current weather in a detailed, graphic
 * format for a configurable location, with the standardized `WidgetStatusBar`
 * on top. Self-fetches through the API client (or an injected fetcher), keeps
 * last-known data on error, and honors the base-url contract. The hourly strip
 * (Widget US2) composes into this card via the `HourlyStrip` slot.
 */
export const CurrentWeatherCard = ({
  location,
  fetchForecast,
  baseUrl = '',
  refetchIntervalMs = 900_000,
  className,
}: CurrentWeatherCardProps): JSX.Element => {
  const fetcherRef = useRef<FetchForecast | null>(null);
  if (fetcherRef.current === null) {
    fetcherRef.current = fetchForecast ?? buildDefaultFetcher(baseUrl);
  }

  const [state, setState] = useState<LoadState>(IDLE);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    const fetcher = fetcherRef.current;
    if (fetcher === null) return;
    setState((prev) => ({ ...prev, updating: true }));
    try {
      const data = await fetcher({ location });
      setState({ data, error: null, lastUpdatedAt: Date.now(), updating: false });
    } catch (err) {
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
  const current = data?.current ?? null;

  return (
    <Card data-testid="current-weather-card" className={cn('h-full w-full', className)}>
      <WidgetStatusBar
        lastUpdatedAt={lastUpdatedAt}
        updating={updating}
        error={error}
        onRefresh={() => void load()}
      />

      {data === null && !error && (
        <p className="py-8 text-center text-sm text-slate-500">Loading weather…</p>
      )}

      {data !== null && current !== null && (
        <div className="mt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <ConditionIcon code={current.weatherCode} isDay={current.isDay} />
              <div>
                <p className="text-4xl font-semibold text-slate-800">
                  {formatTemperature(current.temperature)}
                </p>
                <p className="text-sm text-slate-600">{current.condition}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-slate-700">{location.name}</p>
              <p className="text-xs text-slate-500">
                Feels like {formatTemperature(current.apparentTemperature)}
              </p>
            </div>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            <Detail label="Humidity" value={formatPercent(current.humidity)} />
            <Detail label="Wind" value={`${Math.round(current.windSpeed)} km/h`} />
            <Detail label="Precip." value={formatPercent(current.precipitationProbability)} />
            <Detail label="UV index" value={String(current.uvIndex)} />
            <Detail label="Updated" value={formatHour(current.time)} />
          </dl>

          <div className="mt-4 border-t border-slate-100 pt-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Hourly forecast
            </h3>
            <HourlyStrip hourly={data.hourly} now={data.current.time} />
          </div>
        </div>
      )}
    </Card>
  );
};

function Detail({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-700">{value}</dd>
    </div>
  );
}

function ConditionIcon({ code, isDay }: { code: number; isDay: boolean }): JSX.Element {
  const iconKey = iconForWeather(code, isDay);
  return (
    <span
      data-testid="condition-icon"
      aria-hidden="true"
      className="flex h-14 w-14 items-center justify-center rounded-xl border border-amber-200/70 bg-amber-50 text-2xl text-amber-600"
    >
      {ICON_GLYPH[iconKey] ?? '?'}
    </span>
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
