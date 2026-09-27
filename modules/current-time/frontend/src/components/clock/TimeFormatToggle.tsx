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
      className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 p-1 text-sm"
    >
      <button
        type="button"
        aria-pressed={format === '24h'}
        onClick={() => onChange('24h')}
        className="rounded-full px-3 py-1 transition-colors aria-pressed:bg-amber-600 aria-pressed:font-semibold aria-pressed:text-white"
      >
        24h
      </button>
      <button
        type="button"
        aria-pressed={format === '12h'}
        onClick={() => onChange('12h')}
        className="rounded-full px-3 py-1 transition-colors aria-pressed:bg-amber-600 aria-pressed:font-semibold aria-pressed:text-white"
      >
        12h
      </button>
    </div>
  );
}
