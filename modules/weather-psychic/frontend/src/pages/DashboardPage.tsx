import type { JSX } from 'react';
import { CloudSun } from 'lucide-react';
import { CurrentWeatherCard } from '../components/CurrentWeatherCard';
import { DailyForecastCard } from '../components/DailyForecastCard';
import { LocationSelector } from '../components/LocationSelector';
import { useLocation } from '../lib/useLocation';

export interface DashboardPageProps {
  /** Base URL of the module backend (base-url contract); `''` = same-origin `/api`. */
  baseUrl?: string;
}

/**
 * The weather-psychic dashboard: a location selector bound to the persisted
 * choice, with the current + hourly widget and the daily widget side by side.
 */
export function DashboardPage({ baseUrl = '' }: DashboardPageProps): JSX.Element {
  const [location, setLocation] = useLocation();

  return (
    <main className="flex min-h-screen flex-col bg-amber-50/60 px-4 py-8 text-slate-800">
      <header className="mx-auto flex w-full max-w-5xl items-center gap-2 text-slate-500">
        <CloudSun className="size-5 text-amber-600" />
        <h1 className="text-sm font-medium uppercase tracking-[0.3em]">Weather psychic</h1>
      </header>

      <section className="mx-auto mt-6 w-full max-w-5xl">
        <LocationSelector
          value={location}
          onChange={setLocation}
          baseUrl={baseUrl}
          placeholder="Search for a city…"
        />
        {location === null && (
          <p className="mt-4 text-sm text-slate-500">
            Select a location to see the current weather and the forecast ahead.
          </p>
        )}
      </section>

      {location !== null && (
        <section className="mx-auto mt-6 grid w-full max-w-5xl gap-4 lg:grid-cols-2">
          <CurrentWeatherCard location={location} baseUrl={baseUrl} />
          <DailyForecastCard location={location} baseUrl={baseUrl} />
        </section>
      )}
    </main>
  );
}
