import { Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { Logger } from 'pino';
import { errorStatus, toErrorResponse } from '../lib/errors';
import { logger as defaultLogger } from '../lib/logger';
import type { FlyOverService } from '../services/flyOverService';
import { flyOverRoutes } from './routes';

export interface AppDeps {
  /** The shared fly-over service. */
  service: FlyOverService;
  /** Logger for request logging and error reporting (defaults to the process logger). */
  logger?: Logger;
}

/**
 * Build the REST application: per-request logging, the `/api` routes, and
 * consistent 404 / error responses shared with the MCP interface.
 *
 * @param deps - application dependencies
 * @returns a configured Hono app
 */
export function createApp(deps: AppDeps): Hono {
  const app = new Hono();
  const log = deps.logger ?? defaultLogger;

  app.use(async (c, next) => {
    const start = performance.now();
    await next();
    log.info(
      {
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        durationMs: Math.round(performance.now() - start),
      },
      'request',
    );
  });

  app.route('/api', flyOverRoutes(deps.service));

  app.notFound((c) => c.json({ success: false, message: 'Not found' }, 404));

  app.onError((err, c) => {
    const status = errorStatus(err) as ContentfulStatusCode;
    const response = toErrorResponse(err);
    if (status >= 500) {
      log.error({ err }, response.message);
    }
    return c.json(response, status);
  });

  return app;
}
