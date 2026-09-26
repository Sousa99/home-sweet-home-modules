import { Hono } from 'hono';
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { createMcpHonoApp } from '@modelcontextprotocol/hono';
import { LocationQuerySchema } from '../domain/schemas';
import { toErrorResponse } from '../lib/errors';
import type { FlyOverService } from '../services/flyOverService';

export interface McpServerDeps {
  /** The shared fly-over service backing the `planes_over` tool. */
  service: FlyOverService;
}

/**
 * Build the MCP server: a stateless Streamable HTTP endpoint at `/mcp` exposing
 * the `planes_over` tool. A fresh `McpServer` serves each request (factory
 * pattern), matching the module's `opencode.json` remote entry
 * (`http://localhost:3001/mcp`).
 *
 * The tool reuses the same zod schema as the REST endpoint, so both interfaces
 * accept and return identical payloads (parity by construction).
 *
 * @param deps - MCP server dependencies
 * @returns a Hono app serving `/mcp`
 */
export function createMcpApp(deps: McpServerDeps): Hono {
  const handler = createMcpHandler(() => {
    const server = new McpServer({ name: 'fly-over-tracker', version: '0.1.0' });

    server.registerTool(
      'planes_over',
      {
        description:
          'Returns the aircraft currently flying over a GPS point and radius (in kilometers).',
        inputSchema: LocationQuerySchema,
      },
      async ({ lat, lng, radiusKm }) => {
        try {
          const result = await deps.service.query({ lat, lng, radiusKm });
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

    return server;
  });

  const app = createMcpHonoApp();
  app.all('/mcp', (c) => handler.fetch(c.req.raw, { parsedBody: c.get('parsedBody' as never) }));
  return app;
}
