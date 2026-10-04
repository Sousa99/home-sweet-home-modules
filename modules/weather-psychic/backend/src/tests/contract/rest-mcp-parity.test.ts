import { describe, expect, it } from 'vitest';
import type { Hono } from 'hono';
import { MockLocationFeed, MockWeatherFeed } from '../../feeds/mock';
import { createApp } from '../../http/app';
import { createLogger } from '../../lib/logger';
import { createMcpApp } from '../../mcp/server';
import { createWeatherService } from '../../services/weatherService';

const service = createWeatherService({
  weatherFeed: new MockWeatherFeed(),
  locationFeed: new MockLocationFeed(),
});
const restApp = createApp({ service, logger: createLogger({ env: 'test' }) });
const mcpApp = createMcpApp({ service });

const LAT = 38.7167;
const LNG = -9.1333;

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
    new Request('http://127.0.0.1:3204/mcp', {
      method: 'POST',
      headers: {
        host: '127.0.0.1:3204',
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
    new Request('http://127.0.0.1:3204/mcp', {
      method: 'POST',
      headers: {
        host: '127.0.0.1:3204',
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
    serverInfo: { name: 'weather-psychic' },
  });
  await sendNotification(app, { jsonrpc: '2.0', method: 'notifications/initialized' });
}

describe('MCP ↔ REST parity', () => {
  it('advertises the weather tools', async () => {
    await initialize(mcpApp);
    const listed = await postMessage(mcpApp, {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
    });
    const tools = (listed.result as { tools: Array<{ name: string }> } | undefined)?.tools ?? [];
    expect(tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining(['weather.get_forecast', 'weather.search']),
    );
  });

  it('returns the same Forecast as the REST endpoint (parity)', async () => {
    await initialize(mcpApp);

    const restRes = await restApp.request(`/api/weather?lat=${LAT}&lng=${LNG}`);
    const restJson = (await restRes.json()) as {
      location: Record<string, unknown>;
      current: unknown;
      hourly: unknown;
      daily: unknown;
      generatedAt: string;
    };

    const called = await postMessage(mcpApp, {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'weather.get_forecast',
        arguments: { lat: LAT, lng: LNG },
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
    const payload = JSON.parse(content?.[0]?.text ?? '') as {
      location: Record<string, unknown>;
      current: unknown;
      hourly: unknown;
      daily: unknown;
      generatedAt: string;
    };
    // The REST and MCP payloads are byte-identical except `generatedAt` (a
    // server timestamp produced separately per call) — compare structurally.
    expect(payload.location).toEqual(restJson.location);
    expect(payload.current).toEqual(restJson.current);
    expect(payload.hourly).toEqual(restJson.hourly);
    expect(payload.daily).toEqual(restJson.daily);
  });

  it('returns the same location search results (parity)', async () => {
    await initialize(mcpApp);

    const restRes = await restApp.request('/api/locations/search?query=lisbon');
    const restJson = (await restRes.json()) as { results: unknown };

    const called = await postMessage(mcpApp, {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'weather.search',
        arguments: { query: 'lisbon' },
      },
    });

    const content = (
      called.result as
        | {
            content: Array<{ type: string; text: string }>;
          }
        | undefined
    )?.content;
    expect(JSON.parse(content?.[0]?.text ?? '')).toEqual(restJson);
  });

  it('returns an error for invalid tool input', async () => {
    await initialize(mcpApp);
    const called = await postMessage(mcpApp, {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'weather.get_forecast',
        arguments: { lat: 999, lng: 0 },
      },
    });
    const isError = (called.result as { isError?: boolean } | undefined)?.isError;
    expect(called.error ?? isError).toBeTruthy();
  });
});
