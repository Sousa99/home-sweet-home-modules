import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { config } from '../config';
import * as schema from './schema';

export type DB = BetterSQLite3Database<typeof schema>;

export interface OpenDb {
  sqlite: Database.Database;
  db: DB;
}

export function createSqlite(dbPath: string = config.dbPath): Database.Database {
  mkdirSync(dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('synchronous = NORMAL');
  sqlite.pragma('busy_timeout = 5000');
  return sqlite;
}

/**
 * Dedicated connection for bulk ingest: WAL appends without per-commit fsync
 * or auto-checkpointing a growing DB, keeping ~5k chunk transactions cheap.
 * Callers SHOULD run `PRAGMA wal_checkpoint(TRUNCATE)` after the ingest.
 */
export function createIngestSqlite(dbPath: string = config.dbPath): Database.Database {
  mkdirSync(dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('synchronous = OFF');
  sqlite.pragma('wal_autocheckpoint = 0');
  sqlite.pragma('busy_timeout = 5000');
  return sqlite;
}

export function createDb(sqlite: Database.Database): DB {
  return drizzle(sqlite, { schema });
}

export function openDb(dbPath: string = config.dbPath): OpenDb {
  const sqlite = createSqlite(dbPath);
  return { sqlite, db: createDb(sqlite) };
}
