import { z } from 'zod';
import { unzipSync } from 'fflate';

export interface GtfsLine {
  id: string;
  shortName: string;
  longName: string;
  routeType: number;
  agencyId: string | null;
}

export interface GtfsStop {
  id: string;
  name: string;
  lat: number | null;
  lon: number | null;
}

export interface GtfsTrip {
  id: string;
  lineId: string;
  serviceId: string;
  headsign: string;
  directionId: number | null;
}

export interface GtfsStopTime {
  tripId: string;
  stopSequence: number;
  stopId: string;
  arrivalMin: number;
  departureMin: number | null;
  pickupType: number | null;
  dropOffType: number | null;
}

export interface GtfsCalendar {
  serviceId: string;
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
  startDate: string;
  endDate: string;
}

export interface GtfsCalendarDate {
  serviceId: string;
  date: string;
  exceptionType: number;
}

export interface ParsedGtfs {
  lines: GtfsLine[];
  stops: GtfsStop[];
  trips: GtfsTrip[];
  stopTimes: GtfsStopTime[];
  calendar: GtfsCalendar[];
  calendarDates: GtfsCalendarDate[];
  warnings: string[];
}

/** Split a CSV line on commas, honoring double-quoted fields. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out;
}

function parseCsvRows(content: string): Array<Record<string, string>> {
  const normalized = content.replace(/^\uFEFF/, '');
  const lines = normalized.split(/\r?\n/);
  if (lines.length === 0) return [];
  const header = splitCsvLine(lines[0] ?? '').map((h) => h.trim());
  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (line.trim() === '') continue;
    const cells = splitCsvLine(line);
    const row: Record<string, string> = {};
    for (let c = 0; c < header.length; c++) {
      row[header[c]!] = (cells[c] ?? '').trim();
    }
    rows.push(row);
  }
  return rows;
}

/** 'HH:MM:SS' → minutes since midnight; null when unparseable. */
function parseGtfsTime(value: string | undefined): number | null {
  if (value === undefined || value === '') return null;
  const match = /^(\d{1,3}):(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Yields non-empty, decoded lines from a UTF-8 buffer without building one big string. */
function* csvLinesFromBytes(bytes: Uint8Array): Generator<string> {
  const decoder = new TextDecoder();
  let lineStart = 0;
  for (let i = 0; i <= bytes.length; i++) {
    if (i === bytes.length || bytes[i] === 10) {
      let end = i;
      if (end > lineStart && bytes[end - 1] === 13) end--;
      const line = decoder.decode(bytes.subarray(lineStart, end));
      if (line.trim() !== '') yield line;
      lineStart = i + 1;
    }
  }
}

/** Build a header-indexed row object from a CSV line and header. */
function rowFromCsvLine(line: string, header: string[]): Record<string, string> {
  const cells = splitCsvLine(line);
  const row: Record<string, string> = {};
  for (let c = 0; c < header.length; c++) {
    row[header[c]!] = (cells[c] ?? '').trim();
  }
  return row;
}

function parseTable<T>(
  content: string | undefined,
  fileName: string,
  validate: (row: Record<string, string>) => T | null,
  warnings: string[],
): T[] {
  if (content === undefined) {
    warnings.push(`missing file ${fileName}`);
    return [];
  }
  const out: T[] = [];
  const rows = parseCsvRows(content);
  for (const [index, row] of rows.entries()) {
    const parsed = validate(row);
    if (parsed === null) {
      warnings.push(`${fileName} row ${index + 2} skipped (invalid record)`);
      continue;
    }
    out.push(parsed);
  }
  return out;
}

const lineSchema = z.object({
  route_id: z.string().min(1),
  agency_id: z.string().optional(),
  route_short_name: z.string().optional(),
  route_long_name: z.string().optional(),
  route_type: z.coerce.number().int().optional(),
});

const stopSchema = z.object({
  stop_id: z.string().min(1),
  stop_name: z.string().optional(),
  stop_lat: z.coerce.number().optional(),
  stop_lon: z.coerce.number().optional(),
});

const tripSchema = z.object({
  trip_id: z.string().min(1),
  route_id: z.string().min(1),
  service_id: z.string().min(1),
  trip_headsign: z.string().optional(),
  direction_id: z.coerce.number().int().optional(),
});

const stopTimeSchema = z.object({
  trip_id: z.string().min(1),
  stop_sequence: z.coerce.number().int().min(1),
  stop_id: z.string().min(1),
  arrival_time: z.string().optional(),
  departure_time: z.string().optional(),
  pickup_type: z.coerce.number().int().optional(),
  drop_off_type: z.coerce.number().int().optional(),
});

const calendarSchema = z.object({
  service_id: z.string().min(1),
  monday: z.coerce.number().int().optional(),
  tuesday: z.coerce.number().int().optional(),
  wednesday: z.coerce.number().int().optional(),
  thursday: z.coerce.number().int().optional(),
  friday: z.coerce.number().int().optional(),
  saturday: z.coerce.number().int().optional(),
  sunday: z.coerce.number().int().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

const calendarDateSchema = z.object({
  service_id: z.string().min(1),
  date: z.string().min(1),
  exception_type: z.coerce.number().int().optional(),
});

export function unzipGtfs(buffer: Uint8Array): Record<string, Uint8Array> {
  return unzipSync(buffer);
}

function parseStopTimeRow(row: Record<string, string>): GtfsStopTime | null {
  const parsed = stopTimeSchema.safeParse(row);
  if (!parsed.success) return null;
  const r = parsed.data;
  const arrivalMin = parseGtfsTime(r.arrival_time);
  if (arrivalMin === null) return null;
  const departureMin = parseGtfsTime(r.departure_time);
  return {
    tripId: r.trip_id,
    stopSequence: r.stop_sequence,
    stopId: r.stop_id,
    arrivalMin,
    departureMin,
    pickupType: r.pickup_type ?? null,
    dropOffType: r.drop_off_type ?? null,
  };
}

/**
 * Parses the non-stop_times tables from decoded files. Used for small tables
 * whose files fit comfortably in memory.
 */
export function parseGtfsMeta(files: Record<string, string>): Omit<ParsedGtfs, 'stopTimes'> {
  const warnings: string[] = [];

  const lines = parseTable(
    files['routes.txt'],
    'routes.txt',
    (row) => {
      const parsed = lineSchema.safeParse(row);
      if (!parsed.success) return null;
      const r = parsed.data;
      return {
        id: r.route_id,
        shortName: r.route_short_name ?? r.route_id,
        longName: r.route_long_name ?? '',
        routeType: r.route_type ?? 3,
        agencyId: r.agency_id ?? null,
      };
    },
    warnings,
  );

  const stops = parseTable(
    files['stops.txt'],
    'stops.txt',
    (row) => {
      const parsed = stopSchema.safeParse(row);
      if (!parsed.success) return null;
      const r = parsed.data;
      return {
        id: r.stop_id,
        name: r.stop_name ?? r.stop_id,
        lat: r.stop_lat ?? null,
        lon: r.stop_lon ?? null,
      };
    },
    warnings,
  );

  const trips = parseTable(
    files['trips.txt'],
    'trips.txt',
    (row) => {
      const parsed = tripSchema.safeParse(row);
      if (!parsed.success) return null;
      const r = parsed.data;
      return {
        id: r.trip_id,
        lineId: r.route_id,
        serviceId: r.service_id,
        headsign: r.trip_headsign ?? '',
        directionId: r.direction_id ?? null,
      };
    },
    warnings,
  );

  const calendar = parseTable(
    files['calendar.txt'],
    'calendar.txt',
    (row) => {
      const parsed = calendarSchema.safeParse(row);
      if (!parsed.success) return null;
      const r = parsed.data;
      const day = (v: number | undefined) => ((v ?? 0) === 1 ? 1 : 0);
      return {
        serviceId: r.service_id,
        monday: day(r.monday),
        tuesday: day(r.tuesday),
        wednesday: day(r.wednesday),
        thursday: day(r.thursday),
        friday: day(r.friday),
        saturday: day(r.saturday),
        sunday: day(r.sunday),
        startDate: r.start_date ?? '',
        endDate: r.end_date ?? '',
      };
    },
    warnings,
  );

  const calendarDates = parseTable(
    files['calendar_dates.txt'],
    'calendar_dates.txt',
    (row) => {
      const parsed = calendarDateSchema.safeParse(row);
      if (!parsed.success) return null;
      const r = parsed.data;
      return {
        serviceId: r.service_id,
        date: r.date,
        exceptionType: r.exception_type ?? 1,
      };
    },
    warnings,
  );

  return { lines, stops, trips, calendar, calendarDates, warnings };
}

export function parseGtfsFiles(files: Record<string, string>): ParsedGtfs {
  const meta = parseGtfsMeta(files);
  const stopTimes = parseTable(
    files['stop_times.txt'],
    'stop_times.txt',
    parseStopTimeRow,
    meta.warnings,
  );
  return { ...meta, stopTimes };
}

/**
 * Streams stop_times rows from a raw UTF-8 buffer, skipping the header and
 * malformed rows. Avoids materializing the whole file as a JS string or array
 * (Carris Metropolitana's stop_times.txt exceeds the V8 string length limit).
 */
export function* streamStopTimes(bytes: Uint8Array, warnings: string[]): Generator<GtfsStopTime> {
  let first = true;
  let header: string[] = [];
  let lineIndex = 0;
  for (const line of csvLinesFromBytes(bytes)) {
    if (first) {
      first = false;
      header = splitCsvLine(line).map((h) => h.trim());
      continue;
    }
    lineIndex++;
    const parsed = parseStopTimeRow(rowFromCsvLine(line, header));
    if (parsed === null) {
      warnings.push(`stop_times.txt row ${lineIndex + 1} skipped (invalid record)`);
    } else {
      yield parsed;
    }
  }
}

export async function downloadGtfs(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`GTFS download failed: HTTP ${response.status} for ${url}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}
