import { createBackend } from './compose';
import { config } from './config';
import { startHttpServer } from './http/server';
import { logger } from './lib/logger';
import { startMcpServer } from './mcp';

const mode = process.argv.includes('--mcp') ? 'mcp' : 'http';

logger.info('bus-catcher backend starting', {
  mode,
  serverName: config.serverName,
});

const backend = createBackend(config.dbPath);

if (mode === 'http') {
  startHttpServer(backend);
} else {
  startMcpServer(backend);
}
