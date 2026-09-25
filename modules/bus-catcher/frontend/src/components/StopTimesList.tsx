import type { Passing } from '../api/types';
import { countdownLabel, formatScheduledTime } from '../lib/time';
import { Badge } from './ui/badge';

export function StopTimesList({ times }: { times: Passing[] }) {
  if (times.length === 0) {
    return <p className="text-sm text-slate-500">No more buses scheduled today.</p>;
  }
  return (
    <ul className="divide-y divide-slate-100">
      {times.map((time) => (
        <li
          key={`${time.lineId}-${time.scheduledAt}`}
          className="flex items-center justify-between py-1.5"
        >
          <span className="flex items-center gap-2">
            <Badge>{time.lineShortName}</Badge>
            <span className="text-sm text-slate-600">{time.headsign}</span>
          </span>
          <span className="flex items-center gap-3">
            <span className="text-sm tabular-nums text-slate-500">
              {formatScheduledTime(time.scheduledAt)}
            </span>
            <span className="w-20 text-right text-sm font-medium text-slate-800">
              {countdownLabel(time.scheduledAt)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
