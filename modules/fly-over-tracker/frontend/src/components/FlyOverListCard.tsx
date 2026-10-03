import { useState } from 'react';
import type { JSX } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { getApiBaseUrl } from '../api/baseUrl';
import { useFlyOversQuery } from '../hooks/useFlyOversQuery';
import type { Aircraft, LocationQuery } from '../api/types';
import { AircraftMapCard } from './AircraftMapCard';
import { UpdatingIndicator } from './UpdatingIndicator';
import { Button } from './ui/button';
import type { RefreshRate } from './RefreshRateSelect';
import { createWidgetQueryClient } from '../lib/widgetQueryClient';
import { cn } from '../lib/utils';

export interface FlyOverListCardProps {
  /** The location and radius to watch (a valid LocationQuery). */
  location: LocationQuery;
  /** Auto-refresh cadence in seconds; 'off' disables automatic refresh. */
  autoRefresh?: RefreshRate;
  /** Base URL of the module backend; defaults to the runtime-configured
   * value (from `/config.json` / `API_BASE_URL`), `''` = same-origin `/api`. */
  baseUrl?: string;
  /** Maximum number of aircraft to list, closest first; omit to list all. */
  maxResults?: number;
  /** Extra classes applied to the card root. */
  className?: string;
}

/**
 * Self-sufficient embeddable card for a dashboard: a scrollable list of the
 * aircraft within the configured radius, closest first (the backend returns
 * them sorted by distance). `maxResults` caps how many are rendered. Unlike
 * `FlyOverWidget` it renders no map, so a host can place the list and the map
 * (via `FlyOverMapCard`) independently. Fetches and auto-refreshes its own data
 * through `useFlyOversQuery` (no host react-query setup required), shows a
 * top-corner updating indicator while a refresh is in flight, and exposes a
 * manual Refresh action.
 */
export const FlyOverListCard = ({
  location,
  autoRefresh = 'off',
  baseUrl = getApiBaseUrl(),
  maxResults,
  className,
}: FlyOverListCardProps): JSX.Element => {
  const [queryClient] = useState(createWidgetQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <FlyOverListCardContent
        location={location}
        autoRefresh={autoRefresh}
        baseUrl={baseUrl}
        maxResults={maxResults}
        className={className}
      />
    </QueryClientProvider>
  );
};

function FlyOverListCardContent({
  location,
  autoRefresh,
  baseUrl,
  maxResults,
  className,
}: FlyOverListCardProps): JSX.Element {
  const { data, isLoading, isFetching, isError, error, refetch } = useFlyOversQuery({
    location,
    autoRefresh,
    baseUrl,
  });

  const aircraft: Aircraft[] = data?.aircraft ?? [];
  const visible = maxResults === undefined ? aircraft : aircraft.slice(0, maxResults);
  const isEmpty = data !== null && data.count === 0;
  const total = data?.count ?? 0;
  const capped = maxResults !== undefined && total > maxResults;

  return (
    <div className={cn('flex h-full w-full flex-col', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
        <p className="text-sm text-slate-600">
          {capped ? `Closest ${visible.length} of ${total}` : `${total}`} aircraft over{' '}
          {location.lat.toFixed(4)}, {location.lng.toFixed(4)} (±{location.radiusKm} km)
        </p>
        <div className="flex items-center gap-2">
          <UpdatingIndicator visible={isFetching} />
          <Button variant="ghost" size="sm" onClick={refetch}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
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
        {visible.map((aircraftItem) => (
          <AircraftMapCard key={aircraftItem.icao24} aircraft={aircraftItem} />
        ))}
      </div>
    </div>
  );
}
