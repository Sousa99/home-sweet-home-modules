import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { config } from '../config';
import type { BackendDeps } from '../compose';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';
import { createConfigStopBodySchema } from '../lib/schemas';
import { z } from 'zod';

type TextContent = { type: 'text'; text: string };

function ok(value: unknown): { content: TextContent[] } {
  return { content: [{ type: 'text', text: JSON.stringify(value) }] };
}

function fail(err: unknown): { isError: true; content: TextContent[] } {
  const appError = err instanceof AppError ? err : null;
  return {
    isError: true,
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          error: appError?.code ?? 'internal_error',
          detail: appError?.detail ?? undefined,
        }),
      },
    ],
  };
}

export function startMcpServer(deps: BackendDeps): void {
  const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    if (url.pathname !== '/mcp') {
      res.writeHead(404).end('not found');
      return;
    }
    // Stateless mode: the SDK forbids reusing a stateless transport across
    // requests, and a Protocol cannot be reconnected, so each request gets a
    // fresh McpServer + transport with the same registered tools.
    const server = new McpServer({
      name: config.serverName,
      version: '0.1.0',
    });
    registerTools(server, deps);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    void server
      .connect(transport)
      .then(() => transport.handleRequest(req, res))
      .catch((err: unknown) => {
        logger.error('MCP request failed', {
          message: err instanceof Error ? err.message : String(err),
        });
      });
  });

  httpServer.listen(config.mcpPort, () => {
    logger.info('MCP server listening', { port: config.mcpPort });
  });
}

function registerTools(server: McpServer, deps: BackendDeps): void {
  server.registerTool(
    'list_lines',
    {
      title: 'List bus lines',
      description: 'List all bus lines in the ingested network.',
      inputSchema: {},
    },
    async () => {
      const lines = await deps.provider.listLines();
      return ok({ lines });
    },
  );

  server.registerTool(
    'search_stops',
    {
      title: 'Search bus stops',
      description: 'Search bus stops by name.',
      inputSchema: {
        q: z.string().min(2),
        limit: z.number().int().min(1).max(50).optional(),
      },
    },
    async ({ q, limit }) => {
      const stops = await deps.provider.searchStops(q, limit ?? 20);
      return ok({ stops });
    },
  );

  server.registerTool(
    'get_stop',
    {
      title: 'Get a bus stop',
      description: 'Get stop details including the lines serving it.',
      inputSchema: { stopId: z.string() },
    },
    async ({ stopId }) => {
      const stop = await deps.provider.getStop(stopId);
      if (!stop) return fail(new AppError(404, 'not_found', stopId));
      return ok({ stop });
    },
  );

  server.registerTool(
    'get_stop_times',
    {
      title: 'Next scheduled passing times',
      description: 'Get the next scheduled buses at a stop, optionally filtered by line.',
      inputSchema: {
        stopId: z.string(),
        limit: z.number().int().min(1).max(20).optional(),
        lines: z.array(z.string()).optional(),
      },
    },
    async ({ stopId, limit, lines }) => {
      try {
        const times = await deps.schedule.getStopTimes(stopId, {
          limit: limit ?? 5,
          lines,
        });
        return ok({ stopId, times });
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    'get_status',
    {
      title: 'Get schedule freshness',
      description: 'Get the last refresh time, feed version, staleness, and refresh state.',
      inputSchema: {},
    },
    async () => ok(await deps.schedule.getStatus()),
  );

  server.registerTool(
    'refresh_schedule',
    {
      title: 'Refresh the schedule',
      description: 'Re-download and re-ingest the Carris GTFS feed.',
      inputSchema: {},
    },
    async () => ok(deps.refresh.refresh()),
  );

  server.registerTool(
    'get_config',
    {
      title: 'List configured stops',
      description: 'List the user-configured stops.',
      inputSchema: {},
    },
    async () => ok({ stops: deps.config.listConfig() }),
  );

  server.registerTool(
    'add_stop',
    {
      title: 'Add a configured stop',
      description: 'Add a stop (with optional line filter) to the dashboard config.',
      inputSchema: createConfigStopBodySchema,
    },
    async (args) => {
      try {
        const stop = deps.config.addConfigStop(args);
        return ok({ stop });
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    'update_stop',
    {
      title: 'Update a configured stop',
      description: 'Change a configured stop line filter, display order, or enabled state.',
      inputSchema: {
        id: z.number().int(),
        lineFilter: z.array(z.string()).optional(),
        displayOrder: z.number().int().optional(),
        enabled: z.boolean().optional(),
      },
    },
    async (args) => {
      try {
        const stop = deps.config.updateConfigStop(args.id, args);
        return ok({ stop });
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    'remove_stop',
    {
      title: 'Remove a configured stop',
      description: 'Remove a configured stop from the dashboard config.',
      inputSchema: { id: z.number().int() },
    },
    async ({ id }) => {
      try {
        deps.config.removeConfigStop(id);
        return ok({ removed: true });
      } catch (err) {
        return fail(err);
      }
    },
  );
}
