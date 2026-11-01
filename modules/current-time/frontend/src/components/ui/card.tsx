import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-brutal border-brutal bg-surface p-4 shadow-brutal', className)}
      {...props}
    />
  );
}
