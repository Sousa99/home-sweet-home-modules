import type { JSX } from 'react';
import type { FlyOverResult } from '../api/types';
import { AircraftCard } from './AircraftCard';
import { Button } from './ui/button';

export type FlyOverStatus = 'idle' | 'loading' | 'success' | 'error';

export interface FlyOverListProps {
  status: FlyOverStatus;
  result: FlyOverResult | null;
  /** Error message shown in the `error` state. */
  error?: string;
  /** Re-queries the last submitted location. */
  onRefresh: () => void;
}

function formatAsOf(asOf: number): string {
  return new Date(asOf * 1000).toLocaleString();
}

/**
 * The fly-over result area: idle hint, loading, error, and the aircraft list
 * with a manual refresh button.
 */
export const FlyOverList = ({
  status,
  result,
  error,
  onRefresh,
}: FlyOverListProps): JSX.Element | null => {
  if (status === 'idle') {
    return <p className="text-sm text-slate-500">Enter a location to see the aircraft overhead.</p>;
  }

  if (status === 'loading') {
    return <p className="text-sm text-slate-500">Loading aircraft…</p>;
  }

  if (status === 'error') {
    return (
      <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
        {error ?? 'Something went wrong.'}
      </p>
    );
  }

  if (result === null) {
    return null;
  }

  if (result.count === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-500">
          No aircraft within {result.radiusKm} km of this location.
        </p>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">
          {result.count} aircraft over {result.center.lat.toFixed(4)},{' '}
          {result.center.lng.toFixed(4)} (±{result.radiusKm} km) · as of {formatAsOf(result.asOf)}
        </p>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          Refresh
        </Button>
      </div>
      <ul className="space-y-3">
        {result.aircraft.map((aircraft) => (
          <li key={aircraft.icao24}>
            <AircraftCard aircraft={aircraft} />
          </li>
        ))}
      </ul>
    </div>
  );
};
