import type { TimeFormat } from '../../lib/timeFormat';

export interface TimeFormatToggleProps {
  format: TimeFormat;
  onChange: (format: TimeFormat) => void;
}

export function TimeFormatToggle({ format, onChange }: TimeFormatToggleProps) {
  return (
    <div
      role="group"
      aria-label="Time format"
      className="inline-flex items-center rounded-brutal border-brutal bg-surface-alt p-1 text-sm"
    >
      <button
        type="button"
        aria-pressed={format === '24h'}
        onClick={() => onChange('24h')}
        className="rounded-brutal px-3 py-1 transition-colors aria-pressed:bg-accent aria-pressed:font-semibold aria-pressed:text-accent-ink"
      >
        24h
      </button>
      <button
        type="button"
        aria-pressed={format === '12h'}
        onClick={() => onChange('12h')}
        className="rounded-brutal px-3 py-1 transition-colors aria-pressed:bg-accent aria-pressed:font-semibold aria-pressed:text-accent-ink"
      >
        12h
      </button>
    </div>
  );
}
