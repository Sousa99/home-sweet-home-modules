import { useCallback, useState } from 'react';
import type { JSX } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFlyOvers } from './api/client';
import type { LocationQuery } from './api/types';
import { FlyOverForm } from './components/FlyOverForm';
import { FlyOverList } from './components/FlyOverList';
import type { FlyOverStatus } from './components/FlyOverList';
import { FlyOverMap } from './components/FlyOverMap';
import { MapErrorBoundary } from './components/MapErrorBoundary';
import { RefreshRateSelect } from './components/RefreshRateSelect';
import type { RefreshRate } from './components/RefreshRateSelect';
import { ViewModeToggle } from './components/ViewModeToggle';
import type { ViewMode } from './components/ViewModeToggle';
import { queriesEqual } from './lib/location';
import { cn } from './lib/utils';

/** Default center shown and editable before any other location is chosen. */
const DEFAULT_CENTER = { lat: 38.7223, lng: -9.1393 };
const DEFAULT_RADIUS_KM = 10;

/**
 * The fly-over tracker SPA: a query form, a list/map view toggle, an
 * auto-refresh rate, and the current aircraft over the chosen location.
 * The form inputs and the map selection share one location draft, so both
 * stay consistent; the query runs on explicit submit. Data is fetched with
 * TanStack Query, whose `refetchInterval` drives automatic refresh at the
 * selected cadence (paused while the draft diverges from the submitted
 * query) and whose `refetch` backs the manual refresh action. A status area
 * reports when results are stale or a refresh is in flight.
 */
const App = (): JSX.Element => {
  const [mode, setMode] = useState<ViewMode>('list');
  const [draft, setDraft] = useState<LocationQuery>({
    lat: DEFAULT_CENTER.lat,
    lng: DEFAULT_CENTER.lng,
    radiusKm: DEFAULT_RADIUS_KM,
  });
  const [query, setQuery] = useState<LocationQuery | null>(null);
  const [refreshRate, setRefreshRate] = useState<RefreshRate>('off');
  const [mapFailed, setMapFailed] = useState(false);

  const isStale = query !== null && !queriesEqual(draft, query);

  const flyOverQuery = useQuery({
    queryKey: ['fly-overs', query],
    queryFn: () => getFlyOvers(query as LocationQuery),
    enabled: query !== null,
    refetchInterval: refreshRate === 'off' || isStale ? false : refreshRate * 1000,
  });

  const result = flyOverQuery.data ?? null;
  const isUpdating = flyOverQuery.isFetching && result !== null;

  const status: FlyOverStatus =
    query === null
      ? 'idle'
      : flyOverQuery.isError
        ? 'error'
        : flyOverQuery.isLoading
          ? 'loading'
          : 'success';

  const error = flyOverQuery.error instanceof Error ? flyOverQuery.error.message : undefined;

  const handleSubmit = useCallback((nextQuery: LocationQuery) => {
    setDraft(nextQuery);
    setQuery(nextQuery);
  }, []);

  const handleDraftChange = useCallback((nextDraft: LocationQuery) => {
    setDraft(nextDraft);
  }, []);

  const handleRefresh = useCallback(() => {
    void flyOverQuery.refetch();
  }, [flyOverQuery]);

  const mapCenter = draft;
  const mapRadiusKm = draft.radiusKm;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-primary/20 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <h1 className="text-2xl font-semibold text-slate-800">fly-over-tracker</h1>
          <p className="text-sm text-slate-500">Aircraft currently flying over a location</p>
        </div>
      </header>
      <main
        className={cn('mx-auto space-y-6 px-4 py-6', mode === 'map' ? 'max-w-5xl' : 'max-w-3xl')}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-full max-w-3xl">
            <FlyOverForm
              value={draft}
              onChange={handleDraftChange}
              onSubmit={handleSubmit}
              loading={flyOverQuery.isLoading}
            />
          </div>
          <div className="w-full max-w-3xl">
            <RefreshRateSelect value={refreshRate} onChange={setRefreshRate} />
          </div>
          <ViewModeToggle mode={mode} onChange={setMode} />
        </div>

        {(isStale || isUpdating) && (
          <div
            role="status"
            aria-live="polite"
            className="fixed right-4 top-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
          >
            {isStale && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-amber-800 shadow-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 3" />
                </svg>
                <span>
                  Waiting for search — your changes aren’t applied yet. Press “Find aircraft”.
                </span>
              </div>
            )}
            {isUpdating && (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-lg">
                <span
                  className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary/40 border-t-primary"
                  aria-hidden="true"
                />
                Updating…
              </div>
            )}
          </div>
        )}

        {mode === 'map' ? (
          mapFailed ? (
            <div className="space-y-3">
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800" role="alert">
                The map could not be loaded. Results are available in the list view.
              </p>
              <FlyOverList
                status={status}
                result={result}
                error={error}
                onRefresh={handleRefresh}
              />
            </div>
          ) : (
            <div className="space-y-3">
              {status === 'error' && (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
                  {error ?? 'Something went wrong.'}
                </p>
              )}
              <MapErrorBoundary onError={() => setMapFailed(true)}>
                <FlyOverMap
                  center={mapCenter}
                  radiusKm={mapRadiusKm}
                  aircraft={result?.aircraft ?? []}
                  onCenterChange={(nextCenter) =>
                    handleDraftChange({ ...nextCenter, radiusKm: mapRadiusKm })
                  }
                  onRadiusChange={(nextRadius) =>
                    handleDraftChange({
                      lat: mapCenter.lat,
                      lng: mapCenter.lng,
                      radiusKm: nextRadius,
                    })
                  }
                />
              </MapErrorBoundary>
            </div>
          )
        ) : (
          <FlyOverList status={status} result={result} error={error} onRefresh={handleRefresh} />
        )}
      </main>
    </div>
  );
};

export default App;
