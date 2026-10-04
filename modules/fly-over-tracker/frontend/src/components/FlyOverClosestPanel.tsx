import { useState } from 'react';
import type { JSX } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { WidgetStatusBar } from '@sousa99/homesweethome-components';
import { getApiBaseUrl } from '../api/baseUrl';
import { useFlyOversQuery } from '../hooks/useFlyOversQuery';
import type { Aircraft, LocationQuery } from '../api/types';
import { AircraftCard } from './AircraftCard';
import { AircraftMapCard } from './AircraftMapCard';
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
 * and shows the standardized `WidgetStatusBar` (last-update time, updating
 * indicator, manual Refresh, failure notice) above the content, capping the
 * list with `maxResults`.
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
  const { data, dataUpdatedAt, isLoading, isFetching, isError, error, refetch } = useFlyOversQuery({
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
      <div className="pb-2">
        <WidgetStatusBar
          lastUpdatedAt={dataUpdatedAt}
          updating={isFetching}
          error={isError ? (error?.message ?? 'Something went wrong.') : null}
          onRefresh={refetch}
        />
      </div>

      {isLoading && <p className="text-center text-sm text-slate-500">Loading aircraft…</p>}
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
