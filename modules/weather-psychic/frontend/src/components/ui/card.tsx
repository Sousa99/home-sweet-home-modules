import type { JSX, ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface CardProps {
  children?: ReactNode;
  className?: string;
}

/**
 * Shared card chrome following the module's light amber/slate visual language.
 */
export function Card({ children, className }: CardProps): JSX.Element {
  return (
    <div className={cn('rounded-xl border border-amber-200/70 bg-white p-4 shadow-sm', className)}>
      {children}
    </div>
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
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">{title}</h2>
      {subtitle !== undefined && <p className="text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}
