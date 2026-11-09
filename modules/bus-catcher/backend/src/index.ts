import { createBackend } from './compose';
import { config } from './config';
import { startHttpServer } from './http/server';
import { logger } from './lib/logger';
import { startMcpServer } from './mcp';
import { createScheduleLifecycle } from './services/lifecycle';

const mode = process.argv.includes('--mcp') ? 'mcp' : 'http';

logger.info('bus-catcher backend starting', {
  mode,
  serverName: config.serverName,
});

const backend = createBackend(config.dbPath);

if (mode === 'http') {
  // The REST process owns schedule ingestion. Starting the lifecycle only here
  // avoids two containers (REST + MCP, which share the SQLite file) racing to
  // ingest; the MCP process still exposes manual refresh_schedule. The initial
  // check loads an empty database without blocking HTTP startup.
  if (config.scheduleAutoRefresh) {
    createScheduleLifecycle({
      getStatus: () => backend.provider.getStatus(),
      refresh: backend.refresh,
      intervalMs: config.scheduleCheckIntervalMs,
    }).start();
  } else {
    logger.info('schedule auto-refresh disabled (SCHEDULE_AUTO_REFRESH=false)');
  }
  startHttpServer(backend);
} else {
  startMcpServer(backend);
}
