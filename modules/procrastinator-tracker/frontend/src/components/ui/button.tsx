import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

type Variant = 'default' | 'secondary' | 'ghost' | 'outline' | 'destructive';
type Size = 'sm' | 'default' | 'lg' | 'icon';

const variants: Record<Variant, string> = {
  default: 'border-brutal bg-accent text-accent-ink shadow-brutal hover:bg-accent',
  secondary: 'border-brutal bg-surface-alt text-ink shadow-brutal hover:bg-surface',
  ghost: 'text-ink-muted hover:bg-surface-alt',
  outline: 'border-brutal bg-surface text-ink shadow-brutal hover:bg-surface-alt',
  destructive: 'border-brutal bg-error text-surface shadow-brutal hover:bg-error',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  default: 'h-9 px-4 text-sm',
  lg: 'h-11 px-6 text-base',
  icon: 'h-8 w-8',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  className,
  variant = 'default',
  size = 'default',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-brutal font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-outline disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
