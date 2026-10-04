import { useState } from 'react';
import type { JSX } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { WidgetStatusBar } from '@sousa99/homesweethome-components';
import { getApiBaseUrl } from '../api/baseUrl';
import { useFlyOversQuery } from '../hooks/useFlyOversQuery';
import type { Aircraft, LocationQuery } from '../api/types';
import { AircraftMapCard } from './AircraftMapCard';
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
 * through `useFlyOversQuery` (no host react-query setup required), and shows
 * the standardized `WidgetStatusBar` (last-update time, updating indicator,
 * manual Refresh, failure notice) above the list.
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
  const { data, dataUpdatedAt, isLoading, isFetching, isError, error, refetch } = useFlyOversQuery({
    location,
    autoRefresh,
    baseUrl,
  });

  const aircraft: Aircraft[] = data?.aircraft ?? [];
  const visible = maxResults === undefined ? aircraft : aircraft.slice(0, maxResults);
  const isEmpty = data !== null && data.count === 0;

  return (
    <div className={cn('flex h-full w-full flex-col', className)}>
      <div className="pb-2">
        <WidgetStatusBar
          lastUpdatedAt={dataUpdatedAt}
          updating={isFetching}
          error={isError ? (error?.message ?? 'Something went wrong.') : null}
          onRefresh={refetch}
        />
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {isLoading && <p className="text-center text-sm text-slate-500">Loading aircraft…</p>}
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
