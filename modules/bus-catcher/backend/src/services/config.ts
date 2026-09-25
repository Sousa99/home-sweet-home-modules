import { and, eq, max } from 'drizzle-orm';
import { inArray } from 'drizzle-orm';
import type { DB } from '../db/client';
import * as schema from '../db/schema';
import { AppError } from '../lib/errors';
import { parseLineToken } from '../providers/carris-metropolitana/queries';
import type { ConfigStop, CreateConfigStopBody, Stop, UpdateConfigStopBody } from '../lib/schemas';

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

function readLineFilter(raw: string | null): string[] {
  if (raw === null || raw === '') return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string');
  } catch {
    return [];
  }
}

function toConfigStop(
  row: {
    id: number;
    stopId: string;
    lineFilter: string | null;
    displayOrder: number;
    enabled: number;
  },
  stopRow: {
    id: string;
    name: string;
    lat: number | null;
    lon: number | null;
    realtimeId: string | null;
  } | null,
): ConfigStop {
  const base = {
    id: row.id,
    lineFilter: readLineFilter(row.lineFilter),
    displayOrder: row.displayOrder,
    enabled: row.enabled === 1,
  };
  if (!stopRow) {
    // The stop vanished from a refreshed feed; keep the row so the user can
    // see and remove it (spec edge case).
    return { ...base, stop: { id: row.stopId, name: row.stopId, lat: 0, lon: 0 }, missing: true };
  }
  return { ...base, stop: toStop(stopRow) };
}

function loadStop(
  db: DB,
  stopId: string,
): {
  id: string;
  name: string;
  lat: number | null;
  lon: number | null;
  realtimeId: string | null;
} | null {
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
  return row ?? null;
}

/**
 * Validate a line-filter token list. A token is `shortName` (any direction)
 * or `shortName:directionId` (e.g. `736:0`). Directional tokens must resolve
 * to an existing trip of that line in that direction.
 */
function validateLineFilter(db: DB, lineFilter: string[]): void {
  if (lineFilter.length === 0) return;
  const tokens = lineFilter.map(parseLineToken);
  const names = [...new Set(tokens.map((t) => t.shortName))];
  const rows = db
    .select({ shortName: schema.lines.shortName })
    .from(schema.lines)
    .where(inArray(schema.lines.shortName, names))
    .all();
  const found = new Set(rows.map((r) => r.shortName));
  const missing = names.filter((name) => !found.has(name));
  if (missing.length > 0) {
    throw new AppError(400, 'unknown_line', undefined, missing);
  }

  const directional = tokens.filter((t) => t.directionId !== null);
  if (directional.length === 0) return;
  const dirNames = [...new Set(directional.map((t) => t.shortName))];
  const tripRows = db
    .select({ shortName: schema.lines.shortName, directionId: schema.trips.directionId })
    .from(schema.trips)
    .innerJoin(schema.lines, eq(schema.trips.lineId, schema.lines.id))
    .where(inArray(schema.lines.shortName, dirNames))
    .all();
  const validDirs = new Set(tripRows.map((r) => `${r.shortName}:${r.directionId}`));
  const missingDirs = directional
    .filter((t) => !validDirs.has(`${t.shortName}:${t.directionId}`))
    .map((t) => `${t.shortName}:${t.directionId}`);
  if (missingDirs.length > 0) {
    throw new AppError(400, 'unknown_line', undefined, missingDirs);
  }
}

function loadConfigStop(db: DB, id: number): ConfigStop | null {
  const row = db
    .select({
      id: schema.configuredStops.id,
      stopId: schema.configuredStops.stopId,
      lineFilter: schema.configuredStops.lineFilter,
      displayOrder: schema.configuredStops.displayOrder,
      enabled: schema.configuredStops.enabled,
    })
    .from(schema.configuredStops)
    .where(eq(schema.configuredStops.id, id))
    .get();
  if (!row) return null;
  const stopRow = loadStop(db, row.stopId);
  return toConfigStop(row, stopRow);
}

export function listConfig(db: DB): ConfigStop[] {
  const rows = db
    .select({
      id: schema.configuredStops.id,
      stopId: schema.configuredStops.stopId,
      lineFilter: schema.configuredStops.lineFilter,
      displayOrder: schema.configuredStops.displayOrder,
      enabled: schema.configuredStops.enabled,
    })
    .from(schema.configuredStops)
    .orderBy(schema.configuredStops.displayOrder)
    .all();

  const stopsById = new Map(
    db
      .select({
        id: schema.stops.id,
        name: schema.stops.name,
        lat: schema.stops.lat,
        lon: schema.stops.lon,
        realtimeId: schema.stops.realtimeId,
      })
      .from(schema.stops)
      .all()
      .map((s) => [s.id, s]),
  );

  return rows.map((row) => toConfigStop(row, stopsById.get(row.stopId) ?? null));
}

export function getConfigStop(db: DB, id: number): ConfigStop | null {
  return loadConfigStop(db, id);
}

export function addConfigStop(db: DB, body: CreateConfigStopBody): ConfigStop {
  const stopRow = loadStop(db, body.stopId);
  if (!stopRow) {
    throw new AppError(400, 'unknown_stop', body.stopId);
  }

  const lineFilter = body.lineFilter ?? [];
  validateLineFilter(db, lineFilter);

  const duplicate = db
    .select({ id: schema.configuredStops.id })
    .from(schema.configuredStops)
    .where(eq(schema.configuredStops.stopId, body.stopId))
    .get();
  if (duplicate) {
    throw new AppError(409, 'duplicate_stop', body.stopId);
  }

  const maxRow = db
    .select({ value: max(schema.configuredStops.displayOrder) })
    .from(schema.configuredStops)
    .get();
  const displayOrder =
    body.displayOrder ??
    (maxRow?.value === null || maxRow?.value === undefined ? 0 : maxRow.value + 1);
  const enabled = body.enabled ?? true;

  const inserted = db
    .insert(schema.configuredStops)
    .values({
      stopId: body.stopId,
      lineFilter: JSON.stringify(lineFilter),
      displayOrder,
      enabled: enabled ? 1 : 0,
    })
    .returning({ id: schema.configuredStops.id })
    .get();

  const row = {
    id: inserted.id,
    stopId: body.stopId,
    lineFilter: JSON.stringify(lineFilter),
    displayOrder,
    enabled: enabled ? 1 : 0,
  };
  return toConfigStop(row, stopRow);
}

export function updateConfigStop(db: DB, id: number, body: UpdateConfigStopBody): ConfigStop {
  const existing = loadConfigStop(db, id);
  if (!existing) {
    throw new AppError(404, 'not_found', undefined, id);
  }

  const lineFilter = body.lineFilter ?? existing.lineFilter;
  validateLineFilter(db, lineFilter);

  db.update(schema.configuredStops)
    .set({
      lineFilter: JSON.stringify(lineFilter),
      displayOrder: body.displayOrder ?? existing.displayOrder,
      enabled: (body.enabled ?? existing.enabled) ? 1 : 0,
    })
    .where(and(eq(schema.configuredStops.id, id)))
    .run();

  const updated = loadConfigStop(db, id);
  if (!updated) throw new AppError(500, 'internal_error');
  return updated;
}

export function removeConfigStop(db: DB, id: number): void {
  const result = db.delete(schema.configuredStops).where(eq(schema.configuredStops.id, id)).run();
  if (result.changes === 0) {
    throw new AppError(404, 'not_found', undefined, id);
  }
}

export interface ConfigService {
  listConfig(): ConfigStop[];
  getConfigStop(id: number): ConfigStop | null;
  addConfigStop(body: CreateConfigStopBody): ConfigStop;
  updateConfigStop(id: number, body: UpdateConfigStopBody): ConfigStop;
  removeConfigStop(id: number): void;
}

export function createConfigService(db: DB): ConfigService {
  return {
    listConfig: () => listConfig(db),
    getConfigStop: (id) => getConfigStop(db, id),
    addConfigStop: (body) => addConfigStop(db, body),
    updateConfigStop: (id, body) => updateConfigStop(db, id, body),
    removeConfigStop: (id) => removeConfigStop(db, id),
  };
}
