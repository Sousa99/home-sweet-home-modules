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
        'flex h-full w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-amber-200/70 bg-white/60 px-6 text-center',
        className,
      )}
      data-testid="task-deck-empty"
      {...props}
    >
      <Inbox aria-hidden className="size-8 text-slate-300" />
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  );
}
