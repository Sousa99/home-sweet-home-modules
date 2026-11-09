import type Database from 'better-sqlite3';
import { Unzip, UnzipInflate, strFromU8 } from 'fflate';
import { logger } from '../../lib/logger';
import {
  createCsvRowStream,
  parseGtfsMeta,
  parseStopTimeRow,
  parseTripRow,
  type GtfsStopTime,
  type GtfsTrip,
} from './gtfs';

export interface IngestArchiveInput {
  /** The compressed GTFS archive. Transferred from the main thread, not copied. */
  archive: Uint8Array;
  feedVersion: string;
  fetchedAt: string;
}

const BATCH = 500;
const PUSH_CHUNK = 1 << 20;
const MAX_WARNINGS = 100;

const META_FILES = ['routes.txt', 'stops.txt', 'calendar.txt', 'calendar_dates.txt'] as const;
const NEEDED_FILES = new Set<string>([...META_FILES, 'trips.txt', 'stop_times.txt']);

function warn(warnings: string[], message: string): void {
  if (warnings.length < MAX_WARNINGS) warnings.push(message);
}

type StatementCache = Map<string, Database.Statement>;

function insertChunked(
  sqlite: Database.Database,
  statements: StatementCache,
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
    const sql = `INSERT INTO ${table} (${columnList}) VALUES ${placeholders}`;
    let statement = statements.get(sql);
    if (!statement) {
      // Reuse the compiled statement across batches: preparing a new one for
      // every 500 rows of a 10M-row feed churns native memory badly.
      statement = sqlite.prepare(sql);
      statements.set(sql, statement);
    }
    statement.run(...chunk.flat());
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

function tripRow(trip: GtfsTrip): unknown[] {
  return [trip.id, trip.lineId, trip.serviceId, trip.headsign, trip.directionId];
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

const TRIPS_COLUMNS = ['id', 'line_id', 'service_id', 'headsign', 'direction_id'];

function concatChunks(chunks: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const chunk of chunks) total += chunk.length;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/**
 * Memory-bounded GTFS ingest. Instead of decompressing the whole archive (the
 * Carris Metropolitana feed is ~941 MB uncompressed, with a single 794 MB
 * stop_times.txt), this streams the zip in 1 MB compressed chunks, parses
 * trips/stop_times row-by-row, inserts them in batches, and only materializes
 * the small metadata tables. Unused entries (shapes.txt, agency.txt, ...) are
 * never decompressed.
 *
 * Runs on a worker thread (see services/refresh.ts) inside one transaction so
 * the static tables are replaced atomically. User configuration
 * (configured_stops) and metadata survive; FK enforcement is disabled because
 * configured stops may reference stops being replaced.
 */
export async function ingestGtfsArchive(
  sqlite: Database.Database,
  input: IngestArchiveInput,
): Promise<void> {
  sqlite.pragma('foreign_keys = OFF');

  const { archive, feedVersion, fetchedAt } = input;
  const startedAt = Date.now();

  const warnings: string[] = [];
  const metaChunks: Record<string, Uint8Array[]> = {};
  const statements: StatementCache = new Map();
  let tripsCount = 0;
  let stopTimesCount = 0;

  const run = sqlite.transaction(() => {
    sqlite.exec(
      'DELETE FROM stop_times; ' +
        'DELETE FROM trips; ' +
        'DELETE FROM calendar_dates; ' +
        'DELETE FROM calendar; ' +
        'DELETE FROM lines; ' +
        'DELETE FROM stops;',
    );

    let tripsBatch: unknown[][] = [];
    let stopTimesBatch: unknown[][] = [];

    const flushTrips = (): void => {
      if (tripsBatch.length === 0) return;
      insertChunked(sqlite, statements, 'trips', TRIPS_COLUMNS, tripsBatch);
      tripsBatch = [];
    };
    const flushStopTimes = (): void => {
      if (stopTimesBatch.length === 0) return;
      insertChunked(sqlite, statements, 'stop_times', STOP_TIMES_COLUMNS, stopTimesBatch);
      stopTimesBatch = [];
    };

    const unzip = new Unzip();
    unzip.register(UnzipInflate);
    unzip.onfile = (file) => {
      if (!NEEDED_FILES.has(file.name)) return; // never decompress unused entries

      if (file.name === 'trips.txt') {
        const stream = createCsvRowStream((row, line) => {
          const trip = parseTripRow(row);
          if (!trip) {
            warn(warnings, `trips.txt row ${line} skipped (invalid record)`);
            return;
          }
          tripsBatch.push(tripRow(trip));
          tripsCount += 1;
          if (tripsBatch.length >= BATCH) flushTrips();
        });
        file.ondata = (err, chunk, final) => {
          if (err) throw err;
          stream.push(chunk, final);
        };
        file.start();
        return;
      }

      if (file.name === 'stop_times.txt') {
        const stream = createCsvRowStream((row, line) => {
          const stopTime = parseStopTimeRow(row);
          if (!stopTime) {
            warn(warnings, `stop_times.txt row ${line} skipped (invalid record)`);
            return;
          }
          stopTimesBatch.push(stopTimeRow(stopTime));
          stopTimesCount += 1;
          if (stopTimesBatch.length >= BATCH) flushStopTimes();
        });
        file.ondata = (err, chunk, final) => {
          if (err) throw err;
          stream.push(chunk, final);
        };
        file.start();
        return;
      }

      const chunks: Uint8Array[] = [];
      metaChunks[file.name] = chunks;
      file.ondata = (err, chunk) => {
        if (err) throw err;
        chunks.push(chunk);
      };
      file.start();
    };

    for (let offset = 0; offset < archive.length; offset += PUSH_CHUNK) {
      const end = Math.min(offset + PUSH_CHUNK, archive.length);
      unzip.push(archive.subarray(offset, end), end === archive.length);
    }

    flushTrips();
    flushStopTimes();

    const files: Record<string, string> = {};
    for (const name of META_FILES) {
      const chunks = metaChunks[name];
      if (chunks && chunks.length > 0) files[name] = strFromU8(concatChunks(chunks));
    }
    const meta = parseGtfsMeta(files, { includeTrips: false });
    for (const warning of meta.warnings) warn(warnings, warning);

    insertChunked(
      sqlite,
      statements,
      'lines',
      ['id', 'short_name', 'long_name', 'route_type', 'agency_id'],
      meta.lines.map((l) => [l.id, l.shortName, l.longName, l.routeType, l.agencyId]),
    );
    insertChunked(
      sqlite,
      statements,
      'stops',
      ['id', 'name', 'lat', 'lon', 'realtime_id'],
      meta.stops.map((s) => [s.id, s.name, s.lat, s.lon, s.realtimeId]),
    );
    insertChunked(
      sqlite,
      statements,
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
      statements,
      'calendar_dates',
      ['service_id', 'date', 'exception_type'],
      meta.calendarDates.map((c) => [c.serviceId, c.date, c.exceptionType]),
    );

    const metadataStmt = sqlite.prepare(
      'INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)',
    );
    metadataStmt.run('feed_version', feedVersion);
    metadataStmt.run('last_refresh', fetchedAt);

    logger.info('ingest complete', {
      lines: meta.lines.length,
      stops: meta.stops.length,
      trips: tripsCount,
      stopTimes: stopTimesCount,
      feedVersion,
      elapsedMs: Date.now() - startedAt,
    });
  });

  run();

  if (warnings.length > 0) {
    logger.warn('ingest warnings', {
      count: warnings.length,
      sample: warnings.slice(0, 10),
    });
  }
}
