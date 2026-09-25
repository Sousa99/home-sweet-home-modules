import { and, count, eq, inArray, like, or, type SQL } from 'drizzle-orm';
import type { DB } from '../../db/client';
import * as schema from '../../db/schema';
import type { Line, LineOption, Passing, Stop, StopWithLines } from '../../lib/schemas';
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

/** A line-filter token: `shortName` (any direction) or `shortName:directionId`. */
export function parseLineToken(token: string): { shortName: string; directionId: number | null } {
  const [name = '', dir] = token.split(':');
  return { shortName: name, directionId: dir != null && dir !== '' ? Number(dir) : null };
}

function dateToGtfs(date: string): string {
  return date.replace(/-/g, '');
}

function weekdayIndex(date: string): number {
  const [y = 0, m = 0, d = 0] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function toStop(row: {
  id: string;
  name: string;
  lat: number | null;
  lon: number | null;
  realtimeId: string | null;
}): Stop {
  return {
    id: row.id,
    name: row.name,
    lat: row.lat ?? 0,
    lon: row.lon ?? 0,
    realtimeId: row.realtimeId,
  };
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
      realtimeId: schema.stops.realtimeId,
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

export function servingLines(db: DB, stopId: string): LineOption[] {
  const rows = db
    .select({
      id: schema.lines.id,
      shortName: schema.lines.shortName,
      longName: schema.lines.longName,
      directionId: schema.trips.directionId,
      headsign: schema.trips.headsign,
      count: count(schema.stopTimes.tripId),
    })
    .from(schema.stopTimes)
    .innerJoin(schema.trips, eq(schema.stopTimes.tripId, schema.trips.id))
    .innerJoin(schema.lines, eq(schema.trips.lineId, schema.lines.id))
    .where(eq(schema.stopTimes.stopId, stopId))
    .groupBy(schema.lines.shortName, schema.trips.directionId, schema.trips.headsign)
    .orderBy(schema.lines.shortName, schema.trips.directionId)
    .all();

  // One option per (shortName, direction); label it with the most common
  // headsign for that direction (deterministic, unlike bare GROUP BY).
  const byKey = new Map<
    string,
    {
      id: string;
      shortName: string;
      longName: string;
      directionId: number | null;
      best: string;
      bestCount: number;
    }
  >();
  for (const row of rows) {
    const key = `${row.shortName}:${row.directionId ?? 'any'}`;
    const current = byKey.get(key);
    if (!current || row.count > current.bestCount) {
      byKey.set(key, {
        id: row.id,
        shortName: row.shortName,
        longName: row.longName,
        directionId: row.directionId,
        best: row.headsign,
        bestCount: row.count,
      });
    }
  }
  return [...byKey.values()]
    .sort(
      (a, b) =>
        a.shortName.localeCompare(b.shortName) || (a.directionId ?? 0) - (b.directionId ?? 0),
    )
    .map((o) => ({
      id: o.id,
      shortName: o.shortName,
      longName: o.longName,
      directionId: o.directionId,
      headsign: o.best,
    }));
}

export function getStop(db: DB, stopId: string): StopWithLines | null {
  const row = db
    .select({
      id: schema.stops.id,
      name: schema.stops.name,
      lat: schema.stops.lat,
      lon: schema.stops.lon,
      realtimeId: schema.stops.realtimeId,
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
    const lineConds: Array<SQL<unknown>> = [];
    for (const token of lineFilter) {
      const { shortName, directionId } = parseLineToken(token);
      if (directionId === null) {
        lineConds.push(eq(schema.lines.shortName, shortName));
      } else {
        lineConds.push(
          and(eq(schema.lines.shortName, shortName), eq(schema.trips.directionId, directionId))!,
        );
      }
    }
    whereConds.push(or(...lineConds));
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
      directionId: schema.trips.directionId,
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
    tripId: string;
    lineId: string;
    lineShortName: string;
    headsign: string;
    directionId: number | null;
  },
  arrival: Date,
  now: Date,
): void {
  if (arrival.getTime() < now.getTime()) return;
  passings.push({
    tripId: row.tripId,
    lineId: row.lineId,
    lineShortName: row.lineShortName,
    headsign: row.headsign,
    directionId: row.directionId,
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
