const DEFAULT_TIME_ZONE = 'Europe/Lisbon';

interface DateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function partsInZone(utc: Date, timeZone: string): DateParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(utc);
  const pick = (type: string): number => {
    const part = parts.find((p) => p.type === type);
    return Number(part?.value ?? 0);
  };
  return {
    year: pick('year'),
    month: pick('month'),
    day: pick('day'),
    hour: pick('hour'),
    minute: pick('minute'),
    second: pick('second'),
  };
}

/** UTC→zone offset in ms such that wallClock = utc + offset. */
function zoneOffsetMs(utc: Date, timeZone: string): number {
  const { year, month, day, hour, minute, second } = partsInZone(utc, timeZone);
  const wallClockAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return wallClockAsUtc - utc.getTime();
}

/**
 * Convert a GTFS service-day clock time to an absolute instant.
 *
 * GTFS times are Lisbon wall-clock minutes since service-day midnight and may
 * exceed 1440 (e.g. 1500 = 01:00 the following day). The zone offset for the
 * target date is derived via Intl, making the conversion DST-correct.
 */
export function minutesToDate(
  minutes: number,
  serviceDate: string,
  timeZone: string = DEFAULT_TIME_ZONE,
): Date {
  const [year = 0, month = 0, day = 0] = serviceDate.split('-').map(Number);
  const totalDays = Math.floor(minutes / 1440);
  const rem = minutes % 1440;
  const hour = Math.floor(rem / 60);
  const minute = rem % 60;

  const wallClockAsUtc = Date.UTC(year, month - 1, day + totalDays, hour, minute, 0);
  const guess = new Date(wallClockAsUtc);
  return new Date(wallClockAsUtc - zoneOffsetMs(guess, timeZone));
}

/** Local calendar date (YYYY-MM-DD) of an instant in the given zone. */
export function dateToServiceDay(date: Date, timeZone: string = DEFAULT_TIME_ZONE): string {
  const { year, month, day } = partsInZone(date, timeZone);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Whole minutes until `to` from `from`, rounded up; negative once passed. */
export function countdownMinutes(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / 60_000);
}
