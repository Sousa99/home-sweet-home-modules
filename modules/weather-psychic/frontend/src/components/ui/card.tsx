import type { HTMLAttributes, JSX } from 'react';
import { cn } from '../../lib/utils';

export type CardProps = HTMLAttributes<HTMLDivElement>;

/** Shared card chrome following the Home Sweet Home neo-brutalist identity. */
export function Card({ className, ...props }: CardProps): JSX.Element {
  return (
    <div
      className={cn('rounded-brutal border-brutal bg-surface p-4 shadow-brutal', className)}
      {...props}
    />
  );
}

export interface CardHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
}

/** Card header row: a title and an optional subtitle. */
export function CardHeader({ title, subtitle, className }: CardHeaderProps): JSX.Element {
  return (
    <div className={cn('mb-3', className)}>
      <h2 className="font-display text-sm font-black uppercase tracking-wide text-ink">{title}</h2>
      {subtitle !== undefined && <p className="text-xs text-ink-muted">{subtitle}</p>}
    </div>
  );
}
