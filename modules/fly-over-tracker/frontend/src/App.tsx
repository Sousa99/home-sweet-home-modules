import { useCallback, useState } from 'react';
import { getFlyOvers } from './api/client';
import type { FlyOverResult, LocationQuery } from './api/types';
import { FlyOverForm } from './components/FlyOverForm';
import { FlyOverList } from './components/FlyOverList';
import type { FlyOverStatus } from './components/FlyOverList';

/**
 * The fly-over tracker SPA: a query form and the current aircraft over the
 * chosen location, with manual refresh.
 */
export default function App() {
  const [query, setQuery] = useState<LocationQuery | null>(null);
  const [result, setResult] = useState<FlyOverResult | null>(null);
  const [status, setStatus] = useState<FlyOverStatus>('idle');
  const [error, setError] = useState<string>();

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
      void run(nextQuery);
    },
    [run],
  );

  const handleRefresh = useCallback(() => {
    if (query !== null) {
      void run(query);
    }
  }, [query, run]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-primary/20 bg-white">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <h1 className="text-2xl font-semibold text-slate-800">fly-over-tracker</h1>
          <p className="text-sm text-slate-500">Aircraft currently flying over a location</p>
        </div>
      </header>
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <FlyOverForm onSubmit={handleSubmit} loading={status === 'loading'} />
        <FlyOverList status={status} result={result} error={error} onRefresh={handleRefresh} />
      </main>
    </div>
  );
}
