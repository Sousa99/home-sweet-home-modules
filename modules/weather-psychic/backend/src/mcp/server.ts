import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { createMcpHonoApp } from '@modelcontextprotocol/hono';
import { ForecastQuerySchema, LocationQuerySchema } from '../domain/schemas';
import { toErrorResponse } from '../lib/errors';
import type { WeatherService } from '../services/weatherService';

export interface McpServerDeps {
  /** The shared weather service backing the weather tools. */
  service: WeatherService;
}

/**
 * Build the MCP server: a stateless Streamable HTTP endpoint at `/mcp` exposing
 * the `weather.get_forecast` and `weather.search` tools. A fresh `McpServer`
 * serves each request (factory pattern).
 *
 * The tools reuse the same zod schemas as the REST endpoints, so both
 * interfaces accept and return identical payloads (parity by construction).
 *
 * @param deps - MCP server dependencies
 * @returns a Hono app serving `/mcp`
 */
export function createMcpApp(deps: McpServerDeps): Hono {
  const handler = createMcpHandler(() => {
    const server = new McpServer({ name: 'weather-psychic', version: '0.1.0' });

    server.registerTool(
      'weather.get_forecast',
      {
        description:
          'Returns the current weather and the hourly + daily forecast for a coordinate.',
        inputSchema: ForecastQuerySchema,
      },
      async ({ lat, lng }) => {
        try {
          const result = await deps.service.getForecast({ lat, lng });
          return {
            content: [{ type: 'text', text: JSON.stringify(result) }],
          };
        } catch (err) {
          return {
            content: [{ type: 'text', text: JSON.stringify(toErrorResponse(err)) }],
            isError: true,
          };
        }
      },
    );

    server.registerTool(
      'weather.search',
      {
        description: 'Search for places by name to use as a weather location.',
        inputSchema: LocationQuerySchema,
      },
      async ({ query }) => {
        try {
          const results = await deps.service.searchLocations(query);
          return {
            content: [{ type: 'text', text: JSON.stringify({ results }) }],
          };
        } catch (err) {
          return {
            content: [{ type: 'text', text: JSON.stringify(toErrorResponse(err)) }],
            isError: true,
          };
        }
      },
    );

    return server;
  });

  const app = createMcpHonoApp();
  // Permissive CORS (see http/app.ts) so browser-based MCP clients can connect.
  app.use('/mcp', cors());
  app.all('/mcp', (c) => handler.fetch(c.req.raw, { parsedBody: c.get('parsedBody' as never) }));
  return app;
}
