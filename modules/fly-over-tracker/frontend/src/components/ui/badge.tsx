import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

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
