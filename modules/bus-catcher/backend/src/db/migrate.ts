import { pathToFileURL } from 'node:url';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { openDb } from './client';
import { logger } from '../lib/logger';

const MIGRATIONS_FOLDER = new URL('../../drizzle', import.meta.url).pathname;

export function migrateDb(dbPath?: string): void {
  const { sqlite, db } = openDb(dbPath);
  try {
    migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    sqlite.close();
  }
}

const isDirectRun =
  process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectRun) {
  migrateDb();
  logger.info('database migrations applied');
}
