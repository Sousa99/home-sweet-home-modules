import { useConfig, useRefresh, useStatus, useStopTimes } from '../api/queries';
import type { ConfigStop, Status } from '../api/types';
import { formatScheduledTime } from '../lib/time';
import { StopTimesList } from '../components/StopTimesList';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

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
        stops.filter((item) => item.enabled).map((item) => <StopCard key={item.id} config={item} />)
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

function StopCard({ config }: { config: ConfigStop }) {
  const times = useStopTimes(config.stop.id, 5, config.lineFilter, !config.missing);

  if (config.missing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{config.stop.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-amber-700">
            This stop no longer exists in the schedule — remove it in Config.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{config.stop.name}</CardTitle>
        {config.lineFilter.length > 0 && <Badge>{config.lineFilter.join(', ')}</Badge>}
      </CardHeader>
      <CardContent>
        {times.isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : times.isError ? (
          <p className="text-sm text-red-600">Stop not found in the current schedule.</p>
        ) : (
          <StopTimesList times={times.data?.times ?? []} />
        )}
      </CardContent>
    </Card>
  );
}
