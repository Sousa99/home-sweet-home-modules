/**
 * Formats a last-updated timestamp as the device-local 24-hour time
 * `HH:MM:SS` (zero-padded), e.g. `14:32:05`. A `null` timestamp (the widget
 * has never successfully loaded) renders `"Not updated yet"`.
 */
export function formatLastUpdated(timestamp: number | null): string {
  if (timestamp === null) return 'Not updated yet';
  const date = new Date(timestamp);
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
