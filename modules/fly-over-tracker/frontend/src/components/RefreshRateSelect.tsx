import type { JSX } from 'react';
import { Label, Select } from './ui/input';

/** The automatic refresh cadence: off, or a number of seconds. */
export type RefreshRate = 'off' | 5 | 10 | 30 | 60;

export interface RefreshRateSelectProps {
  /** The currently selected auto-refresh rate. */
  value: RefreshRate;
  /** Called with the newly selected rate. */
  onChange: (value: RefreshRate) => void;
}

const OPTIONS: Array<{ value: RefreshRate; label: string }> = [
  { value: 'off', label: 'Off' },
  { value: 5, label: '5 seconds' },
  { value: 10, label: '10 seconds' },
  { value: 30, label: '30 seconds' },
  { value: 60, label: '60 seconds' },
];

/**
 * A labeled selector for the auto-refresh cadence. Selecting a new rate
 * reports it via `onChange`; the owner owns the refresh scheduling.
 */
export const RefreshRateSelect = ({ value, onChange }: RefreshRateSelectProps): JSX.Element => {
  return (
    <div>
      <Label htmlFor="refreshRate">Auto-refresh</Label>
      <Select
        id="refreshRate"
        value={String(value)}
        onChange={(event) => {
          const raw = event.target.value;
          const next: RefreshRate = raw === 'off' ? 'off' : (Number(raw) as RefreshRate);
          if (next !== value) onChange(next);
        }}
      >
        {OPTIONS.map((option) => (
          <option key={String(option.value)} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  );
};
