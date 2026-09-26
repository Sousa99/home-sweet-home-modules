import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { LocationQuerySchema } from '../domain/schemas';
import { ValidationError, formatZodError, toErrorResponse } from '../lib/errors';
import type { FlyOverService } from '../services/flyOverService';

/**
 * The fly-over REST routes, mounted under `/api`.
 *
 * @param service - the shared fly-over service
 * @returns a Hono sub-app with `GET /fly-overs`
 */
export function flyOverRoutes(service: FlyOverService): Hono {
  const app = new Hono();

  app.get(
    '/fly-overs',
    zValidator('query', LocationQuerySchema, (result, c) => {
      if (!result.success) {
        const error = new ValidationError('Invalid request', formatZodError(result.error));
        return c.json(toErrorResponse(error), 400);
      }
    }),
    async (c) => {
      const query = c.req.valid('query');
      const result = await service.query(query);
      return c.json(result);
    },
  );

  return app;
}
