/**
 * Formatting helpers for the weather-psychic widgets. Pure functions using
 * locale-aware `Intl` formatting with a stable default locale so tests and
 * rendering are deterministic unless a locale is passed explicitly.
 */

const DEFAULT_LOCALE = 'en-GB';

function formatWith(locale: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** Format a temperature as a signed integer with the degree symbol. */
export function formatTemperature(celsius: number): string {
  return `${Math.round(celsius)}°`;
}

/** Format an ISO-8601 timestamp as a short hour, e.g. "14:00". */
export function formatHour(time: string): string {
  const date = new Date(time);
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

/** Format an ISO-8601 date as a short day label, e.g. "Mon, 5 Oct". */
export function formatDay(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  return formatWith(DEFAULT_LOCALE).format(parsed);
}

/** Format a daily low/high pair, e.g. "14° / 22°". */
export function formatLowHigh(min: number, max: number): string {
  return `${formatTemperature(min)} / ${formatTemperature(max)}`;
}

/** Format a percentage value as an integer percent, e.g. "30%". */
export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}
