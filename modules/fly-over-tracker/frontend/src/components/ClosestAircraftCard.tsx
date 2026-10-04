import { useState } from 'react';
import type { JSX } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { WidgetStatusBar } from '@sousa99/homesweethome-components';
import { getApiBaseUrl } from '../api/baseUrl';
import { useFlyOversQuery } from '../hooks/useFlyOversQuery';
import type { LocationQuery } from '../api/types';
import { AircraftCard } from './AircraftCard';
import type { RefreshRate } from './RefreshRateSelect';
import { createWidgetQueryClient } from '../lib/widgetQueryClient';
import { selectClosest } from '../lib/closest';
import { cn } from '../lib/utils';

export interface ClosestAircraftCardProps {
  /** The location and radius to watch (a valid LocationQuery). */
  location: LocationQuery;
  /** Auto-refresh cadence in seconds; 'off' disables automatic refresh. */
  autoRefresh?: RefreshRate;
  /** Base URL of the module backend; defaults to the runtime-configured
   * value (from `/config.json` / `API_BASE_URL`), `''` = same-origin `/api`. */
  baseUrl?: string;
  /** Extra classes applied to the card root. */
  className?: string;
}

/**
 * Self-sufficient embeddable card for a dashboard: shows the single aircraft
 * nearest to the configured location within the radius, using the full
 * `AircraftCard` presentation. Fills the available width and only the vertical
 * space its content needs. Fetches and auto-refreshes its own data through
 * `useFlyOversQuery`, and shows the standardized `WidgetStatusBar` (last-update
 * time, updating indicator, manual Refresh, failure notice). When the closest
 * aircraft changes, the card content animates in (fade + slide) instead of
 * swapping abruptly.
 */
export const ClosestAircraftCard = ({
  location,
  autoRefresh = 'off',
  baseUrl = getApiBaseUrl(),
  className,
}: ClosestAircraftCardProps): JSX.Element => {
  const [queryClient] = useState(createWidgetQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ClosestAircraftCardContent
        location={location}
        autoRefresh={autoRefresh}
        baseUrl={baseUrl}
        className={className}
      />
    </QueryClientProvider>
  );
};

function ClosestAircraftCardContent({
  location,
  autoRefresh,
  baseUrl,
  className,
}: ClosestAircraftCardProps): JSX.Element {
  const { data, dataUpdatedAt, isLoading, isFetching, isError, error, refetch } = useFlyOversQuery({
    location,
    autoRefresh,
    baseUrl,
  });

  const closest = selectClosest(data?.aircraft ?? []);
  const isEmpty = data !== null && data.count === 0;

  return (
    <div className={cn('relative w-full space-y-2', className)}>
      <WidgetStatusBar
        lastUpdatedAt={dataUpdatedAt}
        updating={isFetching}
        error={isError ? (error?.message ?? 'Something went wrong.') : null}
        onRefresh={refetch}
      />

      {isLoading && <p className="text-center text-sm text-slate-500">Loading aircraft…</p>}
      {isEmpty && (
        <p className="text-center text-sm text-slate-500">
          No aircraft within {location.radiusKm} km of this location.
        </p>
      )}
      {closest !== null && (
        <div key={closest.icao24} className="animate-closest-card-in">
          <AircraftCard aircraft={closest} />
        </div>
      )}
    </div>
  );
}
