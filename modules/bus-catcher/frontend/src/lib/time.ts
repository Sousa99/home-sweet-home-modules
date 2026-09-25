const LISBON = 'Europe/Lisbon';

/** Format an ISO-8601 UTC instant as Lisbon wall-clock time (HH:MM). */
export function formatScheduledTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-PT', {
    timeZone: LISBON,
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Human countdown from now to an ISO instant. */
export function countdownLabel(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const minutes = Math.ceil(diffMs / 60_000);
  if (minutes <= 0) return 'now';
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `in ${hours}h` : `in ${hours}h ${rest}m`;
}
