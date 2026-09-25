import { useConfig, useRefresh, useStatus } from '../api/queries';
import type { Status } from '../api/types';
import { formatScheduledTime } from '../lib/time';
import { StopCard } from '../components/StopCard';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';

export default function DashboardPage() {
  const config = useConfig();
  const status = useStatus();
  const refresh = useRefresh();
  const stops = config.data?.stops ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <StatusBanner status={status.data} />
        <Button
          size="sm"
          variant="outline"
          disabled={status.data?.refreshing || refresh.isPending}
          onClick={() => void refresh.mutateAsync()}
        >
          {status.data?.refreshing ? 'Refreshing…' : 'Refresh schedule'}
        </Button>
      </div>

      {stops.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-sm text-slate-500">
              No stops configured yet. Go to the Config tab to add one.
            </p>
          </CardContent>
        </Card>
      ) : (
        stops
          .filter((item) => item.enabled)
          .map((item) => (
            <StopCard
              key={item.id}
              stopId={item.stop.id}
              stopName={item.stop.name}
              lines={item.lineFilter}
              missing={item.missing}
            />
          ))
      )}
    </div>
  );
}

function StatusBanner({ status }: { status: Status | undefined }) {
  if (!status) return null;
  if (status.refreshing) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
        Refreshing the schedule — times may be temporarily out of date.
      </div>
    );
  }
  if (status.realtimeAvailable === false && status.realtimeLastUpdate !== null) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
        Live ETA is unavailable right now — showing scheduled times.
      </div>
    );
  }
  if (status.stale) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
        Schedule data may be out of date (last refreshed{' '}
        {status.lastRefresh ? formatScheduledTime(status.lastRefresh) : 'never'}
        ).
      </div>
    );
  }
  if (status.lastRefresh) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500">
        Schedule updated {formatScheduledTime(status.lastRefresh)}
      </div>
    );
  }
  return null;
}
