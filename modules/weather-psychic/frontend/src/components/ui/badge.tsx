import type { JSX, ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps {
  children?: ReactNode;
  className?: string;
}

/** A small amber-tinted pill used for compact labels (e.g. condition chips). */
export function Badge({ children, className }: BadgeProps): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-lg border border-amber-200/70 bg-amber-100/60 px-2 py-0.5 text-xs font-medium text-amber-800',
        className,
      )}
    >
      {children}
    </span>
  );
}
