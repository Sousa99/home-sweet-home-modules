import { Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';
import {
  createConfigStopBodySchema,
  nextTimesQuerySchema,
  searchStopsQuerySchema,
  updateConfigStopBodySchema,
} from '../lib/schemas';
import type { ConfigService } from '../services/config';
import type { ScheduleService } from '../services/schedule';
import type { RefreshService } from '../services/refresh';
import type { ScheduleProvider } from '../providers/types';

export interface AppDeps {
  provider: ScheduleProvider;
  config: ConfigService;
  schedule: ScheduleService;
  refresh: RefreshService;
}

export function createApp(deps: AppDeps): Hono {
  const app = new Hono();

  app.onError((err, c) => {
    logger.error('unhandled error', {
      message: err instanceof Error ? err.message : String(err),
    });
    return c.json({ error: 'internal_error' }, 500);
  });

  app.notFound((c) => c.json({ error: 'not_found' }, 404));

  app.get('/api/health', (c) => c.json({ ok: true, service: 'bus-catcher' }));

  app.get('/api/lines', async (c) => {
    const lines = await deps.provider.listLines();
    return c.json({ lines });
  });

  app.get('/api/stops', async (c) => {
    const parsed = searchStopsQuerySchema.safeParse({
      q: c.req.query('q'),
      limit: c.req.query('limit') ?? undefined,
    });
    if (!parsed.success) {
      return c.json({ error: 'invalid_query', detail: parsed.error.issues }, 400);
    }
    const stops = await deps.provider.searchStops(parsed.data.q, parsed.data.limit);
    return c.json({ stops });
  });

  app.get('/api/stops/:id', async (c) => {
    const stop = await deps.provider.getStop(c.req.param('id'));
    if (!stop) return c.json({ error: 'not_found' }, 404);
    return c.json({ stop });
  });

  app.get('/api/stops/:id/times', async (c) => {
    const stopId = c.req.param('id');
    const parsed = nextTimesQuerySchema.safeParse({
      limit: c.req.query('limit') ?? undefined,
      line: c.req.queries('line'),
    });
    if (!parsed.success) {
      return c.json({ error: 'invalid_query', detail: parsed.error.issues }, 400);
    }
    try {
      const result = await deps.schedule.getStopTimes(stopId, {
        limit: parsed.data.limit,
        lines: parsed.data.line,
      });
      return c.json({ stopId, times: result.times, realtime: result.realtime });
    } catch (err) {
      if (err instanceof AppError) {
        return c.json({ error: err.code, detail: err.detail }, err.status as ContentfulStatusCode);
      }
      throw err;
    }
  });

  app.get('/api/status', async (c) => {
    const status = await deps.schedule.getStatus();
    return c.json(status);
  });

  app.post('/api/refresh', (c) => {
    const result = deps.refresh.refresh();
    return c.json(result, 202);
  });

  app.get('/api/config', (c) => {
    return c.json({ stops: deps.config.listConfig() });
  });

  app.post('/api/config/stops', async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'invalid_body' }, 400);
    }
    const parsed = createConfigStopBodySchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'invalid_body', detail: parsed.error.issues }, 400);
    }
    try {
      const stop = deps.config.addConfigStop(parsed.data);
      return c.json({ stop }, 201);
    } catch (err) {
      if (err instanceof AppError) {
        return c.json({ error: err.code, detail: err.detail }, err.status as ContentfulStatusCode);
      }
      throw err;
    }
  });

  app.put('/api/config/stops/:id', async (c) => {
    const id = Number(c.req.param('id'));
    if (!Number.isInteger(id)) {
      return c.json({ error: 'invalid_param' }, 400);
    }
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'invalid_body' }, 400);
    }
    const parsed = updateConfigStopBodySchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'invalid_body', detail: parsed.error.issues }, 400);
    }
    try {
      const stop = deps.config.updateConfigStop(id, parsed.data);
      return c.json({ stop });
    } catch (err) {
      if (err instanceof AppError) {
        return c.json({ error: err.code, detail: err.detail }, err.status as ContentfulStatusCode);
      }
      throw err;
    }
  });

  app.delete('/api/config/stops/:id', (c) => {
    const id = Number(c.req.param('id'));
    if (!Number.isInteger(id)) {
      return c.json({ error: 'invalid_param' }, 400);
    }
    try {
      deps.config.removeConfigStop(id);
      return c.body(null, 204);
    } catch (err) {
      if (err instanceof AppError) {
        return c.json({ error: err.code, detail: err.detail }, err.status as ContentfulStatusCode);
      }
      throw err;
    }
  });

  return app;
}
