import { useQuery } from '@tanstack/react-query';
import { getFlyOvers } from '../api/client';
import type { FlyOverResult, LocationQuery } from '../api/types';
import type { RefreshRate } from '../components/RefreshRateSelect';

export interface UseFlyOversQueryOptions {
  /** The location and radius to watch. */
  location: LocationQuery;
  /** Auto-refresh cadence in seconds; 'off' disables automatic refresh. */
  autoRefresh?: RefreshRate;
  /** Base URL of the module backend; '' (default) = same-origin `/api`. */
  baseUrl?: string;
}

export interface UseFlyOversQueryResult {
  /** The latest result, or null before the first successful fetch. */
  data: FlyOverResult | null;
  /** True only while the first fetch for the current query is in flight. */
  isLoading: boolean;
  /** True whenever a fetch is in flight, including background auto-refreshes. */
  isFetching: boolean;
  /** True when the latest fetch failed. */
  isError: boolean;
  /** The fetch error, when `isError`. */
  error: Error | null;
  /** Re-runs the current query immediately (manual refresh). */
  refetch: () => void;
}

/**
 * Shared data-fetching hook for the embeddable dashboard widgets.
 *
 * Fetches the fly-over result for the configured `location` (and optional
 * `baseUrl`) via TanStack Query, and re-fetches automatically every
 * `autoRefresh` seconds unless it is 'off'. The query key is derived from the
 * location and base URL, so changing either triggers a fresh fetch.
 *
 * This hook must run inside a `QueryClientProvider`. The dashboard widgets wrap
 * themselves in their own per-instance provider (isolated client with
 * `retry:false` and `refetchOnWindowFocus:false`), so host applications do not
 * need any TanStack Query setup of their own.
 */
export const useFlyOversQuery = ({
  location,
  autoRefresh = 'off',
  baseUrl = '',
}: UseFlyOversQueryOptions): UseFlyOversQueryResult => {
  const base = baseUrl ?? '';

  const query = useQuery<FlyOverResult, Error>({
    queryKey: ['fly-overs', location, base],
    queryFn: () => getFlyOvers(location, base),
    refetchInterval: autoRefresh === 'off' ? false : autoRefresh * 1000,
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error ?? null,
    refetch: () => void query.refetch(),
  };
};
