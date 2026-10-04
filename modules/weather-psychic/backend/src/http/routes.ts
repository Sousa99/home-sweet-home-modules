import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { ForecastQuerySchema, LocationQuerySchema } from '../domain/schemas';
import { ValidationError, formatZodError, toErrorResponse } from '../lib/errors';
import type { WeatherService } from '../services/weatherService';

/**
 * The weather REST routes, mounted under `/api`.
 *
 * @param service - the shared weather service
 * @returns a Hono sub-app with `GET /health`, `GET /weather`, and
 *   `GET /locations/search`
 */
export function weatherRoutes(service: WeatherService): Hono {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, service: 'weather-psychic' }));

  app.get(
    '/weather',
    zValidator('query', ForecastQuerySchema, (result, c) => {
      if (!result.success) {
        const error = new ValidationError('Invalid forecast query', formatZodError(result.error));
        return c.json(toErrorResponse(error), 400);
      }
    }),
    async (c) => {
      const query = c.req.valid('query');
      const forecast = await service.getForecast(query);
      return c.json(forecast);
    },
  );

  app.get(
    '/locations/search',
    zValidator('query', LocationQuerySchema, (result, c) => {
      if (!result.success) {
        const error = new ValidationError('Invalid location query', formatZodError(result.error));
        return c.json(toErrorResponse(error), 400);
      }
    }),
    async (c) => {
      const query = c.req.valid('query');
      const results = await service.searchLocations(query.query);
      return c.json({ results });
    },
  );

  return app;
}
