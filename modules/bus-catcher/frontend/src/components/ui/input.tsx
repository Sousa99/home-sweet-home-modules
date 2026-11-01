import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { cn } from '../../lib/utils';

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn('mb-1 block text-xs font-medium text-ink-muted', className)} {...props} />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-9 w-full rounded-brutal border-brutal bg-surface px-3 text-sm text-ink placeholder:text-ink-muted focus:border-outline focus:outline-2 focus:outline-outline',
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full rounded-brutal border-brutal bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-outline focus:outline-2 focus:outline-outline',
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-9 w-full rounded-brutal border-brutal bg-surface px-3 text-sm text-ink focus:border-outline focus:outline-2 focus:outline-outline',
        className,
      )}
      {...props}
    />
  );
}
