import type { DepartureThresholds, Passing } from '../api/types';
import { resolveThresholds, urgencyDotClass, urgencyLevel } from '../lib/urgency';
import { formatDelay, formatScheduledTime } from '../lib/time';
import { Badge } from './ui/badge';

const pillClass = 'inline-flex w-20 items-center justify-center rounded-brutal px-2 py-0.5 text-xs';

export function StopTimesList({
  times,
  thresholds,
}: {
  times: Passing[];
  thresholds?: Partial<DepartureThresholds>;
}) {
  const resolved = resolveThresholds(thresholds);
  if (times.length === 0) {
    return <p className="text-sm text-ink-muted">No more buses scheduled today.</p>;
  }
  return (
    <ul className="divide-y divide-outline">
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
              <span className="text-sm text-ink-muted">{time.headsign}</span>
            </span>
            <span className="flex items-center gap-3">
              <span className="w-14 text-right text-xs font-medium text-ink-muted">
                {delay ?? ''}
              </span>
              <span className="text-sm tabular-nums text-ink-muted">
                {formatScheduledTime(shownAt)}
              </span>
              {live ? (
                <span className={`${pillClass} bg-ok text-ok`}>Live</span>
              ) : (
                <span className={`${pillClass} bg-surface-alt text-accent`}>Schedule</span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
