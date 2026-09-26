import type { DepartureThresholds, Passing } from '../api/types';
import { resolveThresholds, urgencyDotClass, urgencyLevel } from '../lib/urgency';
import { formatDelay, formatScheduledTime } from '../lib/time';
import { Badge } from './ui/badge';

const pillClass = 'inline-flex w-20 items-center justify-center rounded-full px-2 py-0.5 text-xs';

export function StopTimesList({
  times,
  thresholds,
}: {
  times: Passing[];
  thresholds?: Partial<DepartureThresholds>;
}) {
  const resolved = resolveThresholds(thresholds);
  if (times.length === 0) {
    return <p className="text-sm text-slate-500">No more buses scheduled today.</p>;
  }
  return (
    <ul className="divide-y divide-slate-100">
      {times.map((time) => {
        const live = time.source === 'live' && time.predictedAt !== undefined;
        const shownAt = live ? time.predictedAt! : time.scheduledAt;
        const delay = formatDelay(time.delayMinutes);
        const level = urgencyLevel(time.minutesUntil, resolved);
        return (
          <li
            key={`${time.lineId}-${time.scheduledAt}`}
            className="flex items-center justify-between py-1.5"
          >
            <span className="flex items-center gap-2">
              <span
                data-testid="urgency-dot"
                aria-hidden="true"
                className={`h-2 w-2 shrink-0 rounded-full ${urgencyDotClass(level)}`}
              />
              <Badge>{time.lineShortName}</Badge>
              <span className="text-sm text-slate-600">{time.headsign}</span>
            </span>
            <span className="flex items-center gap-3">
              <span className="w-14 text-right text-xs font-medium text-slate-600">
                {delay ?? ''}
              </span>
              <span className="text-sm tabular-nums text-slate-500">
                {formatScheduledTime(shownAt)}
              </span>
              {live ? (
                <span className={`${pillClass} bg-emerald-100 text-emerald-700`}>Live</span>
              ) : (
                <span className={`${pillClass} bg-amber-100 text-amber-800`}>Schedule</span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
