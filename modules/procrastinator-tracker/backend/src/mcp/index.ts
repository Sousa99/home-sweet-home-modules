import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { DB } from '../db/client';
import { registerTaskTools } from './tools-task';
import { registerTagTools } from './tools-tag';
import { registerUserTools } from './tools-user';

/**
 * Creates an MCP server instance with registered tools for tasks, tags, and users.
 * @param db The database instance.
 * @returns The MCP server instance.
 */
export function createMcpServer(db: DB) {
  const server = new McpServer({ name: 'procrastinator-tracker', version: '1.0.0' });

  registerTaskTools(server, db);
  registerTagTools(server, db);
  registerUserTools(server, db);

  return server;
}

interface McpSession {
  server: McpServer;
  transport: WebStandardStreamableHTTPServerTransport;
}

/** Cap on tracked sessions; the oldest is evicted when exceeded. */
const MAX_SESSIONS = 32;

/**
 * Creates an HTTP application that serves the MCP server and a health check endpoint.
 * @param db The database instance.
 * @returns An object containing the Hono app and a promise that resolves when the server is ready.
 */
export function createMcpHttpApp(db: DB) {
  // Each client gets its own `McpServer` + transport keyed by the session id the
  // transport generates. A single shared server rejects a second initialize with
  // "Server already initialized", which broke reconnects and multi-client use;
  // per-session servers keep the streamable-HTTP handshake working for any number
  // of clients.
  const sessions = new Map<string, McpSession>();

  const app = new Hono();
  app.use('/mcp', cors());
  app.all('/mcp', async (c) => {
    const sessionId = c.req.header('mcp-session-id');
    const existing = sessionId ? sessions.get(sessionId) : undefined;
    if (existing) {
      return existing.transport.handleRequest(c.req.raw);
    }

    let generatedId: string | null = null;
    const server = createMcpServer(db);
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: () => (generatedId = crypto.randomUUID()),
      enableJsonResponse: true,
    });
    void server.connect(transport).catch(() => undefined);

    const response = await transport.handleRequest(c.req.raw);
    if (generatedId) {
      sessions.set(generatedId, { server, transport });
      if (sessions.size > MAX_SESSIONS) {
        const oldest = sessions.keys().next().value;
        if (oldest) sessions.delete(oldest);
      }
    }
    return response;
  });
  app.get('/health', (c) => c.json({ status: 'ok' }));

  return { app, ready: Promise.resolve() };
}
