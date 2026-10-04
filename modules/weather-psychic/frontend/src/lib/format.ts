/**
 * Formatting helpers for the weather-psychic widgets. Pure functions.
 *
 * Timestamps are treated as **already-localized by the backend** (the provider
 * returns local-time timestamps for the location's timezone). To render the
 * wall-clock exactly as encoded — independent of the user's device timezone —
 * parsing and formatting happen in the UTC frame. This keeps tests and
 * rendering deterministic.
 */

function formatWith(locale: string, options?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...options });
}

/**
 * Parse a timestamp as an absolute instant, treating offset-less local
 * wall-clock strings (the provider's localized times) as UTC so the encoded
 * hour renders unchanged. Strings carrying an explicit offset/`Z` parse as-is.
 */
function parseTimestamp(value: string): Date {
  const hasOffset = /(Z|[+-]\d{2}:?\d{2})$/.test(value);
  return new Date(hasOffset ? value : `${value}Z`);
}

/** Format a temperature as a signed integer with the degree symbol. */
export function formatTemperature(celsius: number): string {
  return `${Math.round(celsius)}°`;
}

/** Format an ISO-8601 timestamp as a short hour, e.g. "14:00". */
export function formatHour(time: string): string {
  const date = parseTimestamp(time);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

/** Format an ISO-8601 date as a short day label, e.g. "Mon, 5 Oct". */
export function formatDay(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  return formatWith('en-GB', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(parsed);
}

/** Format a daily low/high pair, e.g. "14° / 22°". */
export function formatLowHigh(min: number, max: number): string {
  return `${formatTemperature(min)} / ${formatTemperature(max)}`;
}

/** Format a percentage value as an integer percent, e.g. "30%". */
export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}
