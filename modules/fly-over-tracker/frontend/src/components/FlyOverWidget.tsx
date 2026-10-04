import { useState } from 'react';
import type { JSX } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { WidgetStatusBar } from '@sousa99/homesweethome-components';
import { getApiBaseUrl } from '../api/baseUrl';
import { useFlyOversQuery } from '../hooks/useFlyOversQuery';
import type { Aircraft, Center, LocationQuery } from '../api/types';
import { AircraftMapView } from './AircraftMapView';
import { AircraftMapCard } from './AircraftMapCard';
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
  /** Log map layout/tile diagnostics to the console (`[fly-over-map]`). */
  debug?: boolean;
  /** Extra classes applied to the widget root. */
  className?: string;
}

/**
 * Self-sufficient embeddable widget for a dashboard: a read-only map of the
 * configured location with the aircraft within the radius listed beneath it
 * (compact `AircraftMapCard`s). Fills the available width; the map expands to
 * the available vertical space and the list takes its natural height,
 * scrolling when it exceeds the space. Fetches and auto-refreshes its own data
 * through `useFlyOversQuery` (no host react-query setup required), and shows
 * the standardized `WidgetStatusBar` (last-update time, updating indicator,
 * manual Refresh, failure notice) above the map.
 */
export const FlyOverWidget = ({
  location,
  autoRefresh = 'off',
  baseUrl = getApiBaseUrl(),
  maxResults,
  tileUrl,
  debug = false,
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
        debug={debug}
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
  debug,
  className,
}: FlyOverWidgetProps): JSX.Element {
  const { data, dataUpdatedAt, isLoading, isFetching, isError, error, refetch } = useFlyOversQuery({
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
      <div className="pb-2">
        <WidgetStatusBar
          lastUpdatedAt={dataUpdatedAt}
          updating={isFetching}
          error={isError ? (error?.message ?? 'Something went wrong.') : null}
          onRefresh={refetch}
        />
      </div>

      <div className="min-h-0 flex-1">
        <AircraftMapView
          center={center}
          radiusKm={location.radiusKm}
          aircraft={aircraft}
          tileUrl={tileUrl}
          debug={debug}
        />
      </div>

      <div className="mt-2 max-h-[40%] shrink-0 space-y-2 overflow-y-auto border-t border-slate-100 pt-2">
        {isLoading && <p className="text-center text-sm text-slate-500">Loading aircraft…</p>}
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
