import { useState } from 'react';
import type { JSX } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { getApiBaseUrl } from '../api/baseUrl';
import { useFlyOversQuery } from '../hooks/useFlyOversQuery';
import type { Aircraft, LocationQuery } from '../api/types';
import { AircraftCard } from './AircraftCard';
import { AircraftMapCard } from './AircraftMapCard';
import { UpdatingIndicator } from './UpdatingIndicator';
import { Button } from './ui/button';
import type { RefreshRate } from './RefreshRateSelect';
import { createWidgetQueryClient } from '../lib/widgetQueryClient';
import { selectClosest } from '../lib/closest';
import { cn } from '../lib/utils';

export interface FlyOverClosestPanelProps {
  /** The location and radius to watch (a valid LocationQuery). */
  location: LocationQuery;
  /** Auto-refresh cadence in seconds; 'off' disables automatic refresh. */
  autoRefresh?: RefreshRate;
  /** Base URL of the module backend; defaults to the runtime-configured
   * value (from `/config.json` / `API_BASE_URL`), `''` = same-origin `/api`. */
  baseUrl?: string;
  /** Maximum number of aircraft to list after the closest tile; omit for all. */
  maxResults?: number;
  /** Extra classes applied to the panel root. */
  className?: string;
}

/**
 * Self-sufficient embeddable panel for a dashboard: the single nearest aircraft
 * as a prominent tile (full `AircraftCard`) followed by the remaining aircraft
 * as compact list cards — the closest is **not** repeated in the list. Renders
 * no map, so a host can pair it with `FlyOverMapCard` for a two-region layout.
 *
 * Fetches once through `useFlyOversQuery` (no host react-query setup required),
 * shows a top-corner updating indicator while a refresh is in flight, exposes a
 * manual Refresh action, and caps the list with `maxResults`.
 */
export const FlyOverClosestPanel = ({
  location,
  autoRefresh = 'off',
  baseUrl = getApiBaseUrl(),
  maxResults,
  className,
}: FlyOverClosestPanelProps): JSX.Element => {
  const [queryClient] = useState(createWidgetQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <FlyOverClosestPanelContent
        location={location}
        autoRefresh={autoRefresh}
        baseUrl={baseUrl}
        maxResults={maxResults}
        className={className}
      />
    </QueryClientProvider>
  );
};

function FlyOverClosestPanelContent({
  location,
  autoRefresh,
  baseUrl,
  maxResults,
  className,
}: FlyOverClosestPanelProps): JSX.Element {
  const { data, isLoading, isFetching, isError, error, refetch } = useFlyOversQuery({
    location,
    autoRefresh,
    baseUrl,
  });

  const aircraft: Aircraft[] = data?.aircraft ?? [];
  const closest = selectClosest(aircraft);
  const rest = closest === null ? aircraft : aircraft.filter((a) => a.icao24 !== closest.icao24);
  const visible = maxResults === undefined ? rest : rest.slice(0, maxResults);
  const isEmpty = data !== null && data.count === 0;

  return (
    <div className={cn('flex h-full w-full flex-col', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
        <p className="text-sm text-slate-600">
          {data === null
            ? `Aircraft over ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)} (±
              ${location.radiusKm} km)`
            : `${data.count} aircraft over ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)} (±
              ${location.radiusKm} km)`}
        </p>
        <div className="flex items-center gap-2">
          <UpdatingIndicator visible={isFetching} />
          <Button variant="ghost" size="sm" onClick={refetch}>
            Refresh
          </Button>
        </div>
      </div>

      {isLoading && <p className="text-center text-sm text-slate-500">Loading aircraft…</p>}
      {isError && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error?.message ?? 'Something went wrong.'}
        </p>
      )}
      {isEmpty && (
        <p className="text-center text-sm text-slate-500">
          No aircraft within {location.radiusKm} km of this location.
        </p>
      )}
      {closest !== null && (
        <div key={closest.icao24} className="shrink-0 animate-closest-card-in">
          <AircraftCard aircraft={closest} />
        </div>
      )}
      {visible.length > 0 && (
        <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto">
          {visible.map((aircraftItem) => (
            <AircraftMapCard key={aircraftItem.icao24} aircraft={aircraftItem} />
          ))}
        </div>
      )}
    </div>
  );
}
