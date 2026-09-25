import { and, eq, inArray, like, or, type SQL } from 'drizzle-orm';
import type { DB } from '../../db/client';
import * as schema from '../../db/schema';
import type { Line, Passing, Stop, StopWithLines } from '../../lib/schemas';
import { countdownMinutes, dateToServiceDay, minutesToDate } from '../../lib/time';

const WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

const DEFAULT_TIME_ZONE = 'Europe/Lisbon';

function dateToGtfs(date: string): string {
  return date.replace(/-/g, '');
}

function weekdayIndex(date: string): number {
  const [y = 0, m = 0, d = 0] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function toStop(row: { id: string; name: string; lat: number | null; lon: number | null }): Stop {
  return { id: row.id, name: row.name, lat: row.lat ?? 0, lon: row.lon ?? 0 };
}

function toLine(row: { id: string; shortName: string; longName: string }): Line {
  return { id: row.id, shortName: row.shortName, longName: row.longName };
}

/** service_ids that run on the given local date (YYYY-MM-DD), per calendar + calendar_dates. */
export function resolveActiveServiceIds(db: DB, date: string): string[] {
  const weekday = WEEKDAYS[weekdayIndex(date)] ?? 'sunday';
  const gtfsDate = dateToGtfs(date);

  const calendarRows = db.select().from(schema.calendar).all();
  const active = new Set(
    calendarRows
      .filter((c) => c[weekday] === 1 && c.startDate <= gtfsDate && gtfsDate <= c.endDate)
      .map((c) => c.serviceId),
  );

  const exceptions = db
    .select()
    .from(schema.calendarDates)
    .where(eq(schema.calendarDates.date, gtfsDate))
    .all();
  const removed = new Set<string>();
  const added = new Set<string>();
  for (const ex of exceptions) {
    if (ex.exceptionType === 1) added.add(ex.serviceId);
    else removed.add(ex.serviceId);
  }
  for (const id of removed) active.delete(id);
  for (const id of added) active.add(id);

  return [...active];
}

export function searchStops(db: DB, query: string, limit: number): Stop[] {
  const rows = db
    .select({
      id: schema.stops.id,
      name: schema.stops.name,
      lat: schema.stops.lat,
      lon: schema.stops.lon,
    })
    .from(schema.stops)
    .where(like(schema.stops.name, `%${query}%`))
    .orderBy(schema.stops.name)
    .limit(limit)
    .all();
  return rows.map(toStop);
}

export function listLines(db: DB): Line[] {
  const rows = db
    .select({
      id: schema.lines.id,
      shortName: schema.lines.shortName,
      longName: schema.lines.longName,
    })
    .from(schema.lines)
    .orderBy(schema.lines.shortName)
    .all();
  return rows.map(toLine);
}

export function servingLines(db: DB, stopId: string): Line[] {
  const rows = db
    .select({
      id: schema.lines.id,
      shortName: schema.lines.shortName,
      longName: schema.lines.longName,
    })
    .from(schema.stopTimes)
    .innerJoin(schema.trips, eq(schema.stopTimes.tripId, schema.trips.id))
    .innerJoin(schema.lines, eq(schema.trips.lineId, schema.lines.id))
    .where(eq(schema.stopTimes.stopId, stopId))
    .groupBy(schema.lines.id)
    .orderBy(schema.lines.shortName)
    .all();
  return rows.map(toLine);
}

export function getStop(db: DB, stopId: string): StopWithLines | null {
  const row = db
    .select({
      id: schema.stops.id,
      name: schema.stops.name,
      lat: schema.stops.lat,
      lon: schema.stops.lon,
    })
    .from(schema.stops)
    .where(eq(schema.stops.id, stopId))
    .get();
  if (!row) return null;
  return { ...toStop(row), lines: servingLines(db, stopId) };
}

export interface NextTimesParams {
  now: Date;
  limit?: number;
  lines?: string[];
  timeZone?: string;
}

export function nextTimes(db: DB, stopId: string, params: NextTimesParams): Passing[] {
  const tz = params.timeZone ?? DEFAULT_TIME_ZONE;
  const limit = params.limit ?? 5;
  const lineFilter = params.lines ?? [];
  const now = params.now;

  const today = dateToServiceDay(now, tz);
  const yesterday = dateToServiceDay(new Date(now.getTime() - 86_400_000), tz);
  const activeYesterday = resolveActiveServiceIds(db, yesterday);
  const activeToday = resolveActiveServiceIds(db, today);

  const whereConds: Array<SQL<unknown> | undefined> = [eq(schema.stopTimes.stopId, stopId)];
  if (lineFilter.length > 0) {
    whereConds.push(inArray(schema.lines.shortName, lineFilter));
  }
  const serviceConds: Array<SQL<unknown>> = [];
  if (activeYesterday.length > 0) {
    serviceConds.push(inArray(schema.trips.serviceId, activeYesterday));
  }
  if (activeToday.length > 0) {
    serviceConds.push(inArray(schema.trips.serviceId, activeToday));
  }
  if (serviceConds.length === 0) return [];
  whereConds.push(or(...serviceConds));

  const rows = db
    .select({
      tripId: schema.stopTimes.tripId,
      arrivalMin: schema.stopTimes.arrivalMin,
      serviceId: schema.trips.serviceId,
      lineId: schema.trips.lineId,
      lineShortName: schema.lines.shortName,
      headsign: schema.trips.headsign,
    })
    .from(schema.stopTimes)
    .innerJoin(schema.trips, eq(schema.stopTimes.tripId, schema.trips.id))
    .innerJoin(schema.lines, eq(schema.trips.lineId, schema.lines.id))
    .where(and(...whereConds))
    .all();

  const passings: Passing[] = [];
  for (const row of rows) {
    if (activeToday.includes(row.serviceId)) {
      pushPassing(passings, row, minutesToDate(row.arrivalMin, today, tz), now);
    }
    if (activeYesterday.includes(row.serviceId)) {
      pushPassing(passings, row, minutesToDate(row.arrivalMin, yesterday, tz), now);
    }
  }

  passings.sort((a, b) => a.minutesUntil - b.minutesUntil);
  return passings.slice(0, limit);
}

function pushPassing(
  passings: Passing[],
  row: {
    lineId: string;
    lineShortName: string;
    headsign: string;
  },
  arrival: Date,
  now: Date,
): void {
  if (arrival.getTime() < now.getTime()) return;
  passings.push({
    lineId: row.lineId,
    lineShortName: row.lineShortName,
    headsign: row.headsign,
    scheduledAt: arrival.toISOString(),
    minutesUntil: countdownMinutes(now, arrival),
  });
}

export function getMetadata(db: DB, key: string): string | null {
  const row = db
    .select({ value: schema.metadata.value })
    .from(schema.metadata)
    .where(eq(schema.metadata.key, key))
    .get();
  return row?.value ?? null;
}

export function setMetadata(db: DB, key: string, value: string): void {
  db.insert(schema.metadata)
    .values({ key, value })
    .onConflictDoUpdate({ target: schema.metadata.key, set: { value } })
    .run();
}
