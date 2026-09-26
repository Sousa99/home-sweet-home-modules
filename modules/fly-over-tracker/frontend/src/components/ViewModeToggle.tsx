import type { JSX } from 'react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';

export type ViewMode = 'list' | 'map';

export interface ViewModeToggleProps {
  /** The currently active display mode. */
  mode: ViewMode;
  /** Called with the newly requested mode when the user selects it. */
  onChange: (mode: ViewMode) => void;
}

const OPTIONS: Array<{ value: ViewMode; label: string }> = [
  { value: 'list', label: 'List' },
  { value: 'map', label: 'Map' },
];

/**
 * Single-action control that switches the fly-over results display between
 * the list and the map. Re-selecting the active mode is a no-op.
 */
export const ViewModeToggle = ({ mode, onChange }: ViewModeToggleProps): JSX.Element => {
  return (
    <div
      role="group"
      aria-label="View mode"
      className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm"
    >
      {OPTIONS.map((option) => {
        const active = mode === option.value;
        return (
          <Button
            key={option.value}
            type="button"
            variant={active ? 'secondary' : 'ghost'}
            size="sm"
            aria-pressed={active}
            className={cn(active && 'font-medium')}
            onClick={() => {
              if (!active) onChange(option.value);
            }}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
};
