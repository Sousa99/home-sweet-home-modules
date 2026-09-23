import { useState } from 'react';
import type { JSX } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFlyOversQuery } from '../hooks/useFlyOversQuery';
import type { Aircraft, LocationQuery } from '../api/types';
import { AircraftCard } from './AircraftCard';
import { UpdatingIndicator } from './UpdatingIndicator';
import { Button } from './ui/button';
import type { RefreshRate } from './RefreshRateSelect';
import { cn } from '../lib/utils';

/** Isolated query client matching the SPA's config; see `FlyOverWidget`. */
function createWidgetQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  });
}

/**
 * Deterministically select the closest aircraft to the configured location:
 * the minimum `distanceKm`, with a lexicographic `icao24` tie-break so the
 * selection is stable regardless of result ordering (spec FR-009).
 */
function selectClosest(aircraft: Aircraft[]): Aircraft | null {
  if (aircraft.length === 0) return null;
  return aircraft.reduce<Aircraft>((closest, candidate) => {
    if (candidate.distanceKm < closest.distanceKm) return candidate;
    if (candidate.distanceKm === closest.distanceKm && candidate.icao24 < closest.icao24) {
      return candidate;
    }
    return closest;
  }, aircraft[0]!);
}

export interface ClosestAircraftCardProps {
  /** The location and radius to watch (a valid LocationQuery). */
  location: LocationQuery;
  /** Auto-refresh cadence in seconds; 'off' disables automatic refresh. */
  autoRefresh?: RefreshRate;
  /** Base URL of the module backend; '' (default) = same-origin `/api`. */
  baseUrl?: string;
  /** Extra classes applied to the card root. */
  className?: string;
}

/**
 * Self-sufficient embeddable card for a dashboard: shows the single aircraft
 * nearest to the configured location within the radius, using the full
 * `AircraftCard` presentation. Fills the available width and only the vertical
 * space its content needs. Fetches and auto-refreshes its own data through
 * `useFlyOversQuery`, shows a top-corner updating indicator while a refresh is
 * in flight, and exposes a manual Refresh action. When the closest aircraft
 * changes, the card content animates in (fade + slide) instead of swapping
 * abruptly.
 */
export const ClosestAircraftCard = ({
  location,
  autoRefresh = 'off',
  baseUrl = '',
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
  const { data, isLoading, isFetching, isError, error, refetch } = useFlyOversQuery({
    location,
    autoRefresh,
    baseUrl,
  });

  const closest = selectClosest(data?.aircraft ?? []);
  const isEmpty = data !== null && data.count === 0;

  return (
    <div className={cn('relative w-full space-y-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-slate-600">Closest aircraft</p>
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
        <div key={closest.icao24} className="animate-closest-card-in">
          <AircraftCard aircraft={closest} />
        </div>
      )}
    </div>
  );
}
