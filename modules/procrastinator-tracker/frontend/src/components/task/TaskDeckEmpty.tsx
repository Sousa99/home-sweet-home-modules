import type { HTMLAttributes } from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '../../lib/utils';

export type TaskDeckEmptyProps = HTMLAttributes<HTMLDivElement> & {
  message: string;
};

export function TaskDeckEmpty({ message, className, ...props }: TaskDeckEmptyProps) {
  return (
    <div
      className={cn(
        'flex h-full w-full flex-col items-center justify-center gap-3 rounded-brutal border-brutal bg-surface px-6 text-center',
        className,
      )}
      data-testid="task-deck-empty"
      {...props}
    >
      <Inbox aria-hidden className="size-8 text-ink-muted" />
      <p className="text-sm text-ink-muted">{message}</p>
    </div>
  );
}
