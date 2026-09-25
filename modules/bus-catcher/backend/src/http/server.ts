import { serve } from '@hono/node-server';
import { config } from '../config';
import type { BackendDeps } from '../compose';
import { logger } from '../lib/logger';
import { createApp } from './app';

export function startHttpServer(deps: BackendDeps): void {
  const app = createApp({
    provider: deps.provider,
    config: deps.config,
    schedule: deps.schedule,
    refresh: deps.refresh,
  });
  serve({ fetch: app.fetch, port: config.restPort }, (info) => {
    logger.info('REST server listening', {
      port: config.restPort,
      address: info.address,
    });
  });
}
