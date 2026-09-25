import { useEffect, useRef, useState } from 'react';
import type { StopTimesResponse } from '../api/types';
import { api } from '../api/client';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { StopCoverage } from './StopCoverage';
import { StopTimesList } from './StopTimesList';

/** Fetcher the widget uses to load waiting times for a stop. */
export type FetchStopTimes = (input: {
  stopId: string;
  limit: number;
  lines: string[];
}) => Promise<StopTimesResponse>;

export interface StopCardProps {
  /** Stop identifier whose waiting times to display. */
  stopId: string;
  /** Stop display name shown in the card header. */
  stopName: string;
  /** The set of buses (line short names) to show; empty means all lines. */
  lines?: string[];
  /** Max number of buses to list. Defaults to 5. */
  limit?: number;
  /** How often to refetch waiting times, in ms. Defaults to 15000; 0 disables polling. */
  refetchIntervalMs?: number;
  /**
   * Custom fetcher override (e.g. Storybook fixtures or a different API).
   * Defaults to the built-in API client. Keep the reference stable.
   */
  fetchTimes?: FetchStopTimes;
  /** The stop no longer exists in the schedule; shows a notice and skips fetching. */
  missing?: boolean;
}

type LoadState =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: StopTimesResponse };

export function StopCard({
  stopId,
  stopName,
  lines = [],
  limit = 5,
  refetchIntervalMs = 15000,
  fetchTimes,
  missing = false,
}: StopCardProps) {
  const fetchRef = useRef<FetchStopTimes | undefined>(fetchTimes);
  fetchRef.current = fetchTimes;
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const linesKey = lines.join(',');

  useEffect(() => {
    if (missing) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const fetchFn =
      fetchRef.current ??
      (({ stopId: id, limit: lim, lines: ln }) => api.getStopTimes(id, lim, ln));
    const load = async () => {
      try {
        const data = await fetchFn({ stopId, limit, lines });
        if (!cancelled) setState({ status: 'ready', data });
      } catch {
        if (!cancelled) setState({ status: 'error' });
      } finally {
        if (refetchIntervalMs > 0 && !cancelled) {
          timer = setTimeout(load, refetchIntervalMs);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [stopId, limit, linesKey, refetchIntervalMs, missing]);

  const times = state.status === 'ready' ? state.data.times : [];
  const realtime = state.status === 'ready' ? state.data.realtime : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{stopName}</CardTitle>
        {lines.length > 0 && <Badge>{lines.join(', ')}</Badge>}
      </CardHeader>
      <CardContent>
        {missing ? (
          <p className="text-sm text-amber-700">
            This stop no longer exists in the schedule — remove it in Config.
          </p>
        ) : state.status === 'loading' ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : state.status === 'error' ? (
          <p className="text-sm text-red-600">Stop not found in the current schedule.</p>
        ) : (
          <>
            <StopTimesList times={times} />
            <div className="mt-2">
              <StopCoverage realtime={realtime} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
