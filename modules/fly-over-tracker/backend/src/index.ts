import { serve, type ServerType } from '@hono/node-server';
import { MockFeed } from './feeds/mock';
import { OpenSkyFeed } from './feeds/opensky';
import { createApp } from './http/app';
import { config } from './lib/config';
import { logger } from './lib/logger';
import { createMcpApp } from './mcp/server';
import { createFlyOverService } from './services/flyOverService';

function selectFeed() {
  return config.feedMode === 'mock' ? new MockFeed() : new OpenSkyFeed();
}

function shutdown(server: ServerType, signal: string) {
  logger.info(`received ${signal}, shutting down`);
  server.close(() => process.exit(0));
  // Force-exit if close hangs (e.g. an in-flight feed request).
  setTimeout(() => process.exit(0), 5000).unref();
}

function main(): void {
  const args = process.argv.slice(2);
  const isHttp = args.includes('--http');
  const isMcp = args.includes('--mcp');
  if (isHttp === isMcp) {
    logger.error('Usage: node dist/index.js --http | --mcp');
    process.exit(1);
  }

  const service = createFlyOverService(selectFeed());

  if (isHttp) {
    const app = createApp({ service });
    const server = serve(
      { fetch: app.fetch, port: config.httpPort, hostname: config.host },
      (info) => {
        logger.info(
          `REST server listening on http://${info.address}:${info.port} (feed: ${config.feedMode})`,
        );
      },
    );
    for (const signal of ['SIGINT', 'SIGTERM'] as const) {
      process.on(signal, () => shutdown(server, signal));
    }
    return;
  }

  const app = createMcpApp({ service });
  const server = serve(
    { fetch: app.fetch, port: config.mcpPort, hostname: config.host },
    (info) => {
      logger.info(
        `MCP server listening on http://${info.address}:${info.port}/mcp (feed: ${config.feedMode})`,
      );
    },
  );
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => shutdown(server, signal));
  }
}

main();
