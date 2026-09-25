import { createDb, createSqlite, type DB } from './db/client';
import { migrateDb } from './db/migrate';
import { createCarrisMetropolitanaProvider } from './providers/carris-metropolitana';
import type { ScheduleProvider } from './providers/types';
import { createConfigService, type ConfigService } from './services/config';
import { createRefreshService, type RefreshService } from './services/refresh';
import { createScheduleService, type ScheduleService } from './services/schedule';

export interface BackendDeps {
  db: DB;
  provider: ScheduleProvider;
  config: ConfigService;
  schedule: ScheduleService;
  refresh: RefreshService;
}

export function createBackend(dbPath: string): BackendDeps {
  migrateDb(dbPath);
  const sqlite = createSqlite(dbPath);
  const db = createDb(sqlite);
  const provider = createCarrisMetropolitanaProvider(db);
  const refresh = createRefreshService({ dbPath });
  return {
    db,
    provider,
    config: createConfigService(db),
    schedule: createScheduleService(provider, refresh),
    refresh,
  };
}
