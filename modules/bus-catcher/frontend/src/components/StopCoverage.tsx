import type { RealtimeInfo } from '../api/types';

function updatedAgeLabel(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  return `${minutes}m ago`;
}

/**
 * Per-stop realtime coverage notice (spec US2/US4): signals schedule-only
 * state when live data is unavailable, and shows live coverage + freshness
 * when it is available.
 */
export function StopCoverage({ realtime }: { realtime?: RealtimeInfo }) {
  if (!realtime) return null;
  if (!realtime.available) {
    return <p className="text-xs text-amber-700">Live times unavailable — showing schedule.</p>;
  }
  if (realtime.liveCount === 0) return null;
  const age = realtime.lastUpdate ? updatedAgeLabel(realtime.lastUpdate) : 'recently';
  return (
    <p className="text-xs text-slate-500">
      Live times for {realtime.liveCount} of {realtime.totalCount} buses · updated {age}
    </p>
  );
}
