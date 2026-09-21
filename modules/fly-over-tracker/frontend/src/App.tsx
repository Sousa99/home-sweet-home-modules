import { useCallback, useState } from 'react';
import type { JSX } from 'react';
import { getFlyOvers } from './api/client';
import type { FlyOverResult, LocationQuery } from './api/types';
import { FlyOverForm } from './components/FlyOverForm';
import { FlyOverList } from './components/FlyOverList';
import type { FlyOverStatus } from './components/FlyOverList';
import { FlyOverMap } from './components/FlyOverMap';
import { MapErrorBoundary } from './components/MapErrorBoundary';
import { ViewModeToggle } from './components/ViewModeToggle';
import type { ViewMode } from './components/ViewModeToggle';
import { cn } from './lib/utils';

/** Fallback center shown in map mode before any location is selected. */
const DEFAULT_CENTER = { lat: 38.7223, lng: -9.1393 };
const DEFAULT_RADIUS_KM = 10;

/**
 * The fly-over tracker SPA: a query form, a list/map view toggle, and the
 * current aircraft over the chosen location, with manual refresh. The form
 * inputs and the map selection share one location draft, so both stay
 * consistent; the query runs on explicit submit.
 */
const App = (): JSX.Element => {
  const [mode, setMode] = useState<ViewMode>('list');
  const [draft, setDraft] = useState<LocationQuery | null>(null);
  const [query, setQuery] = useState<LocationQuery | null>(null);
  const [result, setResult] = useState<FlyOverResult | null>(null);
  const [status, setStatus] = useState<FlyOverStatus>('idle');
  const [error, setError] = useState<string>();
  const [mapFailed, setMapFailed] = useState(false);

  const run = useCallback(async (nextQuery: LocationQuery) => {
    setQuery(nextQuery);
    setStatus('loading');
    setResult(null);
    setError(undefined);
    try {
      const nextResult = await getFlyOvers(nextQuery);
      setResult(nextResult);
      setStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setStatus('error');
    }
  }, []);

  const handleSubmit = useCallback(
    (nextQuery: LocationQuery) => {
      setDraft(nextQuery);
      void run(nextQuery);
    },
    [run],
  );

  const handleDraftChange = useCallback((nextDraft: LocationQuery) => {
    setDraft(nextDraft);
  }, []);

  const handleRefresh = useCallback(() => {
    if (query !== null) {
      void run(query);
    }
  }, [query, run]);

  const mapCenter = draft ?? DEFAULT_CENTER;
  const mapRadiusKm = draft?.radiusKm ?? result?.radiusKm ?? DEFAULT_RADIUS_KM;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-primary/20 bg-white">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <h1 className="text-2xl font-semibold text-slate-800">fly-over-tracker</h1>
          <p className="text-sm text-slate-500">Aircraft currently flying over a location</p>
        </div>
      </header>
      <main
        className={cn('mx-auto space-y-6 px-4 py-6', mode === 'map' ? 'max-w-5xl' : 'max-w-2xl')}
      >
        <div
          className={cn(
            'flex flex-wrap items-start justify-between gap-4',
            mode === 'map' && 'flex-col',
          )}
        >
          <FlyOverForm
            value={draft ?? undefined}
            onChange={handleDraftChange}
            onSubmit={handleSubmit}
            loading={status === 'loading'}
          />
          <ViewModeToggle mode={mode} onChange={setMode} />
        </div>

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
