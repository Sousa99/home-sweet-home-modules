import { useCallback, useEffect, useRef, useState } from 'react';
import { WidgetStatusBar } from '@sousa99/homesweethome-components';
import type { DepartureThresholds, StopTimesResponse } from '../api/types';
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
  /**
   * Optional base URL of the module backend. When empty the built-in client
   * targets the same-origin `/api` path (the SPA default). Used by embeds to
   * point at a remote backend. Ignored when `fetchTimes` is provided.
   */
  baseUrl?: string;
  /** The stop no longer exists in the schedule; shows a notice and skips fetching. */
  missing?: boolean;
  /**
   * Per-stop departure thresholds (minutes before arrival). Optional; when
   * omitted (or partially set) the documented defaults (10 / 5 / 1) apply.
   */
  thresholds?: Partial<DepartureThresholds>;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; data: StopTimesResponse | null; lastUpdatedAt: number | null }
  | { status: 'ready'; data: StopTimesResponse; lastUpdatedAt: number };

export function StopCard({
  stopId,
  stopName,
  lines = [],
  limit = 5,
  refetchIntervalMs = 15000,
  fetchTimes,
  baseUrl,
  missing = false,
  thresholds,
}: StopCardProps) {
  const fetchRef = useRef<FetchStopTimes | undefined>(fetchTimes);
  fetchRef.current = fetchTimes;
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [inFlight, setInFlight] = useState(false);
  const inFlightRef = useRef(false);
  const linesKey = lines.join(',');

  const load = useCallback(async () => {
    // Never start a conflicting load while one is already running (FR-002).
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setInFlight(true);
    try {
      const fetchFn =
        fetchRef.current ??
        (({ stopId: id, limit: lim, lines: ln }) => api.getStopTimes(id, lim, ln, baseUrl));
      const data = await fetchFn({ stopId, limit, lines });
      setState({ status: 'ready', data, lastUpdatedAt: Date.now() });
    } catch {
      // A failed load keeps the last successful data and its timestamp (FR-006);
      // the failure is surfaced by the status bar and Refresh can retry.
      setState((prev) =>
        prev.status === 'ready'
          ? { status: 'error', data: prev.data, lastUpdatedAt: prev.lastUpdatedAt }
          : { status: 'error', data: null, lastUpdatedAt: null },
      );
    } finally {
      inFlightRef.current = false;
      setInFlight(false);
    }
  }, [stopId, limit, linesKey, baseUrl]);

  useEffect(() => {
    if (missing) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = async () => {
      await load();
      if (!cancelled && refetchIntervalMs > 0) {
        timer = setTimeout(run, refetchIntervalMs);
      }
    };
    void run();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [load, refetchIntervalMs, missing]);

  const refresh = useCallback(() => void load(), [load]);

  const data = state.status === 'ready' || state.status === 'error' ? state.data : null;
  const times = data?.times ?? [];
  const realtime = data?.realtime;

  return (
    <div data-testid="stop-card-widget" className="space-y-2">
      <WidgetStatusBar
        lastUpdatedAt={
          state.status === 'error' || state.status === 'ready' ? state.lastUpdatedAt : null
        }
        updating={inFlight}
        error={state.status === 'error' ? 'Stop not found in the current schedule.' : null}
        onRefresh={missing ? undefined : refresh}
      />
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
          ) : data === null ? null : (
            <>
              <StopTimesList times={times} thresholds={thresholds} />
              <div className="mt-2">
                <StopCoverage realtime={realtime} />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
