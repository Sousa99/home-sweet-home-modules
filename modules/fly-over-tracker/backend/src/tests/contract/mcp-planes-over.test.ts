import { describe, expect, it } from 'vitest';
import type { Hono } from 'hono';
import { MockFeed } from '../../feeds/mock';
import { createApp } from '../../http/app';
import { createLogger } from '../../lib/logger';
import { createMcpApp } from '../../mcp/server';
import { createFlyOverService } from '../../services/flyOverService';

const service = createFlyOverService(new MockFeed());
const restApp = createApp({ service, logger: createLogger({ env: 'test' }) });
const mcpApp = createMcpApp({ service });

type JsonRpcMessage = Record<string, unknown>;

/**
 * Extract the JSON-RPC message from a streamable-HTTP response, which may be a
 * plain JSON body or an SSE `data:` line.
 */
function extractMessage(text: string): JsonRpcMessage {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) {
    return JSON.parse(trimmed) as JsonRpcMessage;
  }
  const dataLine = trimmed.split('\n').find((line) => line.startsWith('data:'));
  if (!dataLine) {
    throw new Error(`Cannot parse MCP response: ${text}`);
  }
  return JSON.parse(dataLine.slice('data:'.length).trim()) as JsonRpcMessage;
}

async function postMessage(app: Hono, message: JsonRpcMessage): Promise<JsonRpcMessage> {
  const res = await app.fetch(
    new Request('http://127.0.0.1:3001/mcp', {
      method: 'POST',
      headers: {
        host: '127.0.0.1:3001',
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify(message),
    }),
  );
  return extractMessage(await res.text());
}

async function sendNotification(app: Hono, message: JsonRpcMessage): Promise<void> {
  await app.fetch(
    new Request('http://127.0.0.1:3001/mcp', {
      method: 'POST',
      headers: {
        host: '127.0.0.1:3001',
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify(message),
    }),
  );
}

async function initialize(app: Hono): Promise<void> {
  const init = await postMessage(app, {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '0.0.1' },
    },
  });
  expect(init.result).toBeDefined();
  expect(init.result).toMatchObject({
    serverInfo: { name: 'fly-over-tracker' },
  });
  await sendNotification(app, { jsonrpc: '2.0', method: 'notifications/initialized' });
}

describe('MCP planes_over tool', () => {
  it('advertises the planes_over tool', async () => {
    await initialize(mcpApp);
    const listed = await postMessage(mcpApp, {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
    });
    const tools = (listed.result as { tools: Array<{ name: string }> } | undefined)?.tools ?? [];
    expect(tools.map((tool) => tool.name)).toContain('planes_over');
  });

  it('returns the same FlyOverResult as the REST endpoint (parity)', async () => {
    await initialize(mcpApp);

    const restRes = await restApp.request('/api/fly-overs?lat=48.8566&lng=2.3522&radiusKm=50');
    const restJson = await restRes.json();

    const called = await postMessage(mcpApp, {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'planes_over',
        arguments: { lat: 48.8566, lng: 2.3522, radiusKm: 50 },
      },
    });

    const content = (
      called.result as
        | {
            content: Array<{ type: string; text: string }>;
          }
        | undefined
    )?.content;
    expect(content?.[0]?.type).toBe('text');
    expect(JSON.parse(content?.[0]?.text ?? '')).toEqual(restJson);
  });

  it('returns an error for invalid tool input', async () => {
    await initialize(mcpApp);
    const called = await postMessage(mcpApp, {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'planes_over',
        arguments: { lat: 999, lng: 0, radiusKm: 50 },
      },
    });
    const isError = (called.result as { isError?: boolean } | undefined)?.isError;
    expect(called.error ?? isError).toBeTruthy();
  });
});
