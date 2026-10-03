import { useState } from 'react';
import type { JSX } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { getApiBaseUrl } from '../api/baseUrl';
import { useFlyOversQuery } from '../hooks/useFlyOversQuery';
import type { Aircraft, Center, LocationQuery } from '../api/types';
import { AircraftMapView } from './AircraftMapView';
import { UpdatingIndicator } from './UpdatingIndicator';
import { Button } from './ui/button';
import type { RefreshRate } from './RefreshRateSelect';
import { createWidgetQueryClient } from '../lib/widgetQueryClient';
import { cn } from '../lib/utils';

export interface FlyOverMapCardProps {
  /** The location and radius to watch (a valid LocationQuery). */
  location: LocationQuery;
  /** Auto-refresh cadence in seconds; 'off' disables automatic refresh. */
  autoRefresh?: RefreshRate;
  /** Base URL of the module backend; defaults to the runtime-configured
   * value (from `/config.json` / `API_BASE_URL`), `''` = same-origin `/api`. */
  baseUrl?: string;
  /** Override the tile layer URL (Leaflet `{z}/{x}/{y}` placeholders). */
  tileUrl?: string;
  /** Log map layout/tile diagnostics to the console (`[fly-over-map]`). */
  debug?: boolean;
  /** Extra classes applied to the card root. */
  className?: string;
}

/**
 * Self-sufficient embeddable card for a dashboard: a read-only map of the
 * configured location and radius with the aircraft within range marked at
 * their reported positions. Unlike `FlyOverWidget` it renders no list, so a
 * host can place the map and the list (via `FlyOverListCard`) independently.
 * Fills its container, fetches and auto-refreshes its own data through
 * `useFlyOversQuery` (no host react-query setup required), shows a top-corner
 * updating indicator while a refresh is in flight, and exposes a manual
 * Refresh action.
 */
export const FlyOverMapCard = ({
  location,
  autoRefresh = 'off',
  baseUrl = getApiBaseUrl(),
  className,
  tileUrl,
  debug = false,
}: FlyOverMapCardProps): JSX.Element => {
  const [queryClient] = useState(createWidgetQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <FlyOverMapCardContent
        location={location}
        autoRefresh={autoRefresh}
        baseUrl={baseUrl}
        tileUrl={tileUrl}
        debug={debug}
        className={className}
      />
    </QueryClientProvider>
  );
};

function FlyOverMapCardContent({
  location,
  autoRefresh,
  baseUrl,
  tileUrl,
  debug,
  className,
}: FlyOverMapCardProps): JSX.Element {
  const { data, isFetching, isError, error, refetch } = useFlyOversQuery({
    location,
    autoRefresh,
    baseUrl,
  });

  const center: Center = { lat: location.lat, lng: location.lng };
  const aircraft: Aircraft[] = data?.aircraft ?? [];

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
          debug={debug}
        />
      </div>

      {isError && (
        <p className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error?.message ?? 'Something went wrong.'}
        </p>
      )}
    </div>
  );
}
