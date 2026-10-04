import type { JSX } from 'react';
import { cn } from './cn';
import { formatLastUpdated } from './formatLastUpdated';

export interface WidgetStatusBarProps {
  /** Local time (epoch millis) of the last **successful** data load; `null` = never loaded. */
  lastUpdatedAt: number | null;
  /** True while a load (initial or refresh) is in flight — shows the indicator. */
  updating?: boolean;
  /** Failure message to surface, or null/undefined when healthy. */
  error?: string | null;
  /** Called when the Refresh control is pressed. */
  onRefresh?: () => void;
  /** Extra classes applied to the status bar root. */
  className?: string;
}

/**
 * The standardized status bar shared by every published data-fetching widget
 * across the Home Sweet Home modules. A controlled, presentational component:
 * it renders the local time of the last successful update (or
 * "Not updated yet"), a transient "Updating…" indicator while a load is in
 * flight, a Refresh control, and an optional failure notice — with identical
 * wording, layout, and behavior by construction (FR-004).
 *
 * Accessibility: the status area is a polite live region
 * (`role="status"` + `aria-live="polite"`); the failure notice uses
 * `role="alert"`; the Refresh control is a real `<button>` with the accessible
 * name "Refresh" and is disabled while updating.
 */
export const WidgetStatusBar = ({
  lastUpdatedAt,
  updating = false,
  error = null,
  onRefresh,
  className,
}: WidgetStatusBarProps): JSX.Element => {
  const hasError = error !== null && error !== undefined;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600',
        className,
      )}
    >
      <span role="status" aria-live="polite" className="inline-flex flex-wrap items-center gap-2">
        {lastUpdatedAt === null
          ? 'Not updated yet'
          : `Last updated ${formatLastUpdated(lastUpdatedAt)}`}
        {updating && (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 shadow-sm">
            <span
              className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-primary/40 border-t-primary"
              aria-hidden="true"
            />
            Updating…
          </span>
        )}
      </span>
      {onRefresh !== undefined && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={updating}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50"
        >
          Refresh
        </button>
      )}
      {hasError && <p role="alert">{error}</p>}
    </div>
  );
};
