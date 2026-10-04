function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function localTimeZoneName(date: Date): string {
  const zone = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' })
    .formatToParts(date)
    .find((part) => part.type === 'timeZoneName')?.value;
  if (zone) return zone;
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const abs = Math.abs(offset);
  return `UTC${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/**
 * Formats a last-updated timestamp as a full device-local timestamp — date,
 * 24-hour time, and the local timezone — e.g. `2026-10-04 14:32:05 GMT+1`.
 * A `null` timestamp (the widget has never successfully loaded) renders
 * `"Not updated yet"`.
 */
export function formatLastUpdated(timestamp: number | null): string {
  if (timestamp === null) return 'Not updated yet';
  const date = new Date(timestamp);
  const datePart = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const timePart = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  return `${datePart} ${timePart} ${localTimeZoneName(date)}`;
}
