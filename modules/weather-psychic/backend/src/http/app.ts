import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { Logger } from 'pino';
import { errorStatus, toErrorResponse } from '../lib/errors';
import { logger as defaultLogger } from '../lib/logger';
import type { WeatherService } from '../services/weatherService';
import { weatherRoutes } from './routes';

export interface AppDeps {
  /** The shared weather service. */
  service: WeatherService;
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

  // Permissive CORS: allow any origin so the SPA and embedded widgets can reach
  // the API cross-origin (e.g. via an API_BASE_URL override).
  app.use('/api/*', cors());

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

  app.route('/api', weatherRoutes(deps.service));

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
