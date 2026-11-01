import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import type { TaskStatus } from '../../api/client';

const statusStyles: Record<TaskStatus, string> = {
  'to-start': 'bg-surface-alt text-ink-muted',
  started: 'bg-info text-info',
  'in-progress': 'bg-surface-alt text-accent',
  'on-hold': 'bg-warn text-warn',
  validating: 'bg-info text-info',
  finished: 'bg-ok text-ok',
};

const labels: Record<TaskStatus, string> = {
  'to-start': 'to-start',
  started: 'started',
  'in-progress': 'in-progress',
  'on-hold': 'on-hold',
  validating: 'validating',
  finished: 'finished',
};

export function StatusBadge({
  status,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { status: TaskStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-brutal px-2.5 py-0.5 text-xs font-medium',
        statusStyles[status],
        className,
      )}
      {...props}
    >
      {labels[status]}
    </span>
  );
}

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-brutal bg-surface-alt px-2 py-0.5 text-xs text-ink-muted',
        className,
      )}
      {...props}
    />
  );
}
