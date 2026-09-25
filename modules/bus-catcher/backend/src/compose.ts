import { createDb, createSqlite, type DB } from './db/client';
import { migrateDb } from './db/migrate';
import { config } from './config';
import { createCarrisMetropolitanaProvider } from './providers/carris-metropolitana';
import { createRealtimeClient } from './providers/carris-metropolitana/realtime';
import type { LiveEtaProvider, ScheduleProvider } from './providers/types';
import { createConfigService, type ConfigService } from './services/config';
import { createRefreshService, type RefreshService } from './services/refresh';
import { createScheduleService, type ScheduleService } from './services/schedule';

export interface BackendDeps {
  db: DB;
  provider: ScheduleProvider;
  realtime: LiveEtaProvider;
  config: ConfigService;
  schedule: ScheduleService;
  refresh: RefreshService;
}

export function createBackend(dbPath: string): BackendDeps {
  migrateDb(dbPath);
  const sqlite = createSqlite(dbPath);
  const db = createDb(sqlite);
  const provider = createCarrisMetropolitanaProvider(db);
  const realtime = createRealtimeClient({
    baseUrl: config.realtimeUrl,
    ttlMs: config.realtimeTtlMs,
    staleAfterMs: config.realtimeStaleAfterMs,
  });
  const refresh = createRefreshService({ dbPath });
  return {
    db,
    provider,
    realtime,
    config: createConfigService(db),
    schedule: createScheduleService(provider, refresh, realtime),
    refresh,
  };
}
