import { useState } from 'react';
import type { JSX } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { getApiBaseUrl } from '../api/baseUrl';
import { useFlyOversQuery } from '../hooks/useFlyOversQuery';
import type { Aircraft, Center, LocationQuery } from '../api/types';
import { AircraftMapView } from './AircraftMapView';
import { AircraftMapCard } from './AircraftMapCard';
import { UpdatingIndicator } from './UpdatingIndicator';
import { Button } from './ui/button';
import type { RefreshRate } from './RefreshRateSelect';
import { createWidgetQueryClient } from '../lib/widgetQueryClient';
import { cn } from '../lib/utils';

export interface FlyOverWidgetProps {
  /** The location and radius to watch (a valid LocationQuery). */
  location: LocationQuery;
  /** Auto-refresh cadence in seconds; 'off' disables automatic refresh. */
  autoRefresh?: RefreshRate;
  /** Base URL of the module backend; defaults to the runtime-configured
   * value (from `/config.json` / `API_BASE_URL`), `''` = same-origin `/api`. */
  baseUrl?: string;
  /** Maximum number of aircraft to list, closest first; omit to list all. */
  maxResults?: number;
  /** Override the tile layer URL (Leaflet `{z}/{x}/{y}` placeholders). */
  tileUrl?: string;
  /** Extra classes applied to the widget root. */
  className?: string;
}

/**
 * Self-sufficient embeddable widget for a dashboard: a read-only map of the
 * configured location with the aircraft within the radius listed beneath it
 * (compact `AircraftMapCard`s). Fills the available width; the map expands to
 * the available vertical space and the list takes its natural height,
 * scrolling when it exceeds the space. Fetches and auto-refreshes its own data
 * through `useFlyOversQuery` (no host react-query setup required), shows a
 * top-corner updating indicator while a refresh is in flight, and exposes a
 * manual Refresh action.
 */
export const FlyOverWidget = ({
  location,
  autoRefresh = 'off',
  baseUrl = getApiBaseUrl(),
  maxResults,
  tileUrl,
  className,
}: FlyOverWidgetProps): JSX.Element => {
  const [queryClient] = useState(createWidgetQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <FlyOverWidgetContent
        location={location}
        autoRefresh={autoRefresh}
        baseUrl={baseUrl}
        maxResults={maxResults}
        tileUrl={tileUrl}
        className={className}
      />
    </QueryClientProvider>
  );
};

function FlyOverWidgetContent({
  location,
  autoRefresh,
  baseUrl,
  maxResults,
  tileUrl,
  className,
}: FlyOverWidgetProps): JSX.Element {
  const { data, isLoading, isFetching, isError, error, refetch } = useFlyOversQuery({
    location,
    autoRefresh,
    baseUrl,
  });

  const center: Center = { lat: location.lat, lng: location.lng };
  const aircraft: Aircraft[] = data?.aircraft ?? [];
  const visibleAircraft = maxResults === undefined ? aircraft : aircraft.slice(0, maxResults);
  const isEmpty = data !== null && data.count === 0;

  return (
    <div className={cn('flex h-full w-full flex-col', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
        <p className="text-sm text-slate-600">
          Aircraft over {location.lat.toFixed(4)}, {location.lng.toFixed(4)} (±
          {location.radiusKm} km)
        </p>
        <div className="flex items-center gap-2">
          <UpdatingIndicator visible={isFetching} />
          <Button variant="ghost" size="sm" onClick={refetch}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <AircraftMapView
          center={center}
          radiusKm={location.radiusKm}
          aircraft={aircraft}
          tileUrl={tileUrl}
        />
      </div>

      <div className="mt-2 max-h-[40%] shrink-0 space-y-2 overflow-y-auto border-t border-slate-100 pt-2">
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
        {visibleAircraft.map((aircraftItem) => (
          <AircraftMapCard key={aircraftItem.icao24} aircraft={aircraftItem} />
        ))}
      </div>
    </div>
  );
}
