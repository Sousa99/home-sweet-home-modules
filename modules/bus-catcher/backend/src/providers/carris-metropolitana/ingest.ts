import type Database from 'better-sqlite3';
import { strFromU8 } from 'fflate';
import { logger } from '../../lib/logger';
import { parseGtfsMeta, streamStopTimes, type GtfsStopTime } from './gtfs';

export interface IngestZipInput {
  zip: Record<string, Uint8Array>;
  feedVersion: string;
  fetchedAt: string;
}

const BATCH = 500;

function insertChunked(
  sqlite: Database.Database,
  table: string,
  columns: string[],
  rows: unknown[][],
): void {
  if (rows.length === 0) return;
  const columnList = columns.join(',');
  const rowPlaceholder = `(${columns.map(() => '?').join(',')})`;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const placeholders = chunk.map(() => rowPlaceholder).join(',');
    sqlite
      .prepare(`INSERT INTO ${table} (${columnList}) VALUES ${placeholders}`)
      .run(...chunk.flat());
  }
}

function stopTimeRow(st: GtfsStopTime): unknown[] {
  return [
    st.tripId,
    st.stopSequence,
    st.stopId,
    st.arrivalMin,
    st.departureMin,
    st.pickupType,
    st.dropOffType,
  ];
}

const STOP_TIMES_COLUMNS = [
  'trip_id',
  'stop_sequence',
  'stop_id',
  'arrival_min',
  'departure_min',
  'pickup_type',
  'drop_off_type',
];

/**
 * Atomically replaces the static schedule tables with the parsed feed in a
 * single transaction. Runs on a worker thread (see services/refresh.ts) so it
 * never blocks the main server thread. stop_times is streamed directly from
 * the raw file bytes (it exceeds the V8 string limit for Carris Metropolitana),
 * batching inserts to bound memory. User configuration (configured_stops) and
 * metadata are preserved; FK enforcement is disabled because configured stops
 * may reference stops being replaced.
 */
export async function ingestGtfsZip(
  sqlite: Database.Database,
  input: IngestZipInput,
): Promise<void> {
  sqlite.pragma('foreign_keys = OFF');

  const { zip, feedVersion, fetchedAt } = input;
  const startedAt = Date.now();

  const files: Record<string, string> = {};
  for (const name of [
    'routes.txt',
    'stops.txt',
    'trips.txt',
    'calendar.txt',
    'calendar_dates.txt',
  ]) {
    const bytes = zip[name];
    if (bytes) files[name] = strFromU8(bytes);
  }
  const meta = parseGtfsMeta(files);

  const warnings = meta.warnings;
  const stopTimesBytes = zip['stop_times.txt'];

  const run = sqlite.transaction(() => {
    sqlite.exec(
      'DELETE FROM stop_times; ' +
        'DELETE FROM trips; ' +
        'DELETE FROM calendar_dates; ' +
        'DELETE FROM calendar; ' +
        'DELETE FROM lines; ' +
        'DELETE FROM stops;',
    );

    insertChunked(
      sqlite,
      'lines',
      ['id', 'short_name', 'long_name', 'route_type', 'agency_id'],
      meta.lines.map((l) => [l.id, l.shortName, l.longName, l.routeType, l.agencyId]),
    );
    insertChunked(
      sqlite,
      'stops',
      ['id', 'name', 'lat', 'lon', 'realtime_id'],
      meta.stops.map((s) => [s.id, s.name, s.lat, s.lon, s.realtimeId]),
    );
    insertChunked(
      sqlite,
      'calendar',
      [
        'service_id',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
        'start_date',
        'end_date',
      ],
      meta.calendar.map((c) => [
        c.serviceId,
        c.monday,
        c.tuesday,
        c.wednesday,
        c.thursday,
        c.friday,
        c.saturday,
        c.sunday,
        c.startDate,
        c.endDate,
      ]),
    );
    insertChunked(
      sqlite,
      'calendar_dates',
      ['service_id', 'date', 'exception_type'],
      meta.calendarDates.map((c) => [c.serviceId, c.date, c.exceptionType]),
    );
    insertChunked(
      sqlite,
      'trips',
      ['id', 'line_id', 'service_id', 'headsign', 'direction_id'],
      meta.trips.map((t) => [t.id, t.lineId, t.serviceId, t.headsign, t.directionId]),
    );

    let stopTimesCount = 0;
    if (stopTimesBytes) {
      let batch: unknown[][] = [];
      for (const st of streamStopTimes(stopTimesBytes, warnings)) {
        batch.push(stopTimeRow(st));
        stopTimesCount++;
        if (batch.length >= BATCH) {
          insertChunked(sqlite, 'stop_times', STOP_TIMES_COLUMNS, batch);
          batch = [];
        }
      }
      if (batch.length > 0) {
        insertChunked(sqlite, 'stop_times', STOP_TIMES_COLUMNS, batch);
      }
    }

    const metadataStmt = sqlite.prepare(
      'INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)',
    );
    metadataStmt.run('feed_version', feedVersion);
    metadataStmt.run('last_refresh', fetchedAt);

    logger.info('ingest complete', {
      lines: meta.lines.length,
      stops: meta.stops.length,
      trips: meta.trips.length,
      stopTimes: stopTimesCount,
      feedVersion,
      elapsedMs: Date.now() - startedAt,
    });
  });

  run();
}
