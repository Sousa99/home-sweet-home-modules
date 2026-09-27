import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-amber-200/70 bg-white p-4 shadow-sm transition-shadow hover:shadow',
        className,
      )}
      {...props}
    />
  );
}
