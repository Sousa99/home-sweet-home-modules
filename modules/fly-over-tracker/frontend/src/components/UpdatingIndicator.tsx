import type { JSX } from 'react';

export interface UpdatingIndicatorProps {
  /** Whether a background or manual refresh is currently in flight. */
  visible: boolean;
  /** Accessible label and visible text; defaults to "Updating…". */
  label?: string;
}

/**
 * Small, unobtrusive "update in progress" chip for the embeddable widgets.
 * Renders nothing until `visible` is true, then shows a spinning indicator
 * with a polite live-region label so assistive tech announces the refresh.
 */
export const UpdatingIndicator = ({
  visible,
  label = 'Updating…',
}: UpdatingIndicatorProps): JSX.Element | null => {
  if (!visible) return null;

  return (
    <span
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 shadow-sm"
    >
      <span
        className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-primary/40 border-t-primary"
        aria-hidden="true"
      />
      {label}
    </span>
  );
};
