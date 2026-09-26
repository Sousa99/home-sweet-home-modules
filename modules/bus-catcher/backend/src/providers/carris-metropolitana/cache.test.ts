import { describe, expect, it } from 'vitest';
import { createRealtimeClient } from './realtime';

const BASE_URL = 'https://api.carrismetropolitana.pt/v2';
const TTL_MS = 30_000;
const STALE_AFTER_MS = 90_000;

function makeFetchImpl(responses: Array<() => Promise<Response>>, onCall?: (url: string) => void) {
  let calls = 0;
  const impl: typeof fetch = async (input) => {
    calls += 1;
    onCall?.(typeof input === 'string' ? input : String(input));
    const make = responses[Math.min(calls - 1, responses.length - 1)]!;
    return make();
  };
  return { impl, calls: () => calls };
}

function okJson(payload: unknown): () => Promise<Response> {
  return async () =>
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
}

function failHttp(status = 503): () => Promise<Response> {
  return async () => new Response('down', { status });
}

function notFound(): () => Promise<Response> {
  return async () => new Response('unknown stop', { status: 404 });
}

function throwError(): () => Promise<Response> {
  return async () => {
    throw new Error('network down');
  };
}

const ARRIVALS = [
  {
    trip_id: 'T1',
    line_id: '736',
    headsign: 'Cais',
    estimated_arrival_unix: 1751778650,
    scheduled_arrival_unix: 1751778660,
  },
];

const START = new Date('2026-06-15T10:00:00.000Z');

describe('realtime client — TTL cache', () => {
  it('serves cached arrivals within the TTL without refetching', async () => {
    const { impl, calls } = makeFetchImpl([okJson(ARRIVALS)]);
    const client = createRealtimeClient({
      baseUrl: BASE_URL,
      ttlMs: TTL_MS,
      staleAfterMs: STALE_AFTER_MS,
      fetchImpl: impl,
      now: () => START,
    });

    const first = await client.getStopArrivals('S1');
    expect(first.available).toBe(true);
    expect(first.arrivals).toHaveLength(1);

    const second = await client.getStopArrivals('S1');
    expect(second.arrivals).toHaveLength(1);
    expect(calls()).toBe(1);
  });

  it('refetches after the TTL expires', async () => {
    let current = START.getTime();
    const { impl, calls } = makeFetchImpl([okJson(ARRIVALS), okJson([])]);
    const client = createRealtimeClient({
      baseUrl: BASE_URL,
      ttlMs: TTL_MS,
      staleAfterMs: STALE_AFTER_MS,
      fetchImpl: impl,
      now: () => new Date(current),
    });

    await client.getStopArrivals('S1');
    current += TTL_MS + 1;
    const after = await client.getStopArrivals('S1');
    expect(after.arrivals).toHaveLength(0);
    expect(calls()).toBe(2);
  });

  it('dedupes concurrent fetches with single-flight', async () => {
    const { impl, calls } = makeFetchImpl([okJson(ARRIVALS)]);
    const client = createRealtimeClient({
      baseUrl: BASE_URL,
      ttlMs: TTL_MS,
      staleAfterMs: STALE_AFTER_MS,
      fetchImpl: impl,
      now: () => START,
    });

    const [a, b] = await Promise.all([client.getStopArrivals('S1'), client.getStopArrivals('S1')]);
    expect(a.arrivals).toHaveLength(1);
    expect(b.arrivals).toHaveLength(1);
    expect(calls()).toBe(1);
  });
});

describe('realtime client — degradation', () => {
  it('returns an unavailable snapshot on HTTP failure (never throws)', async () => {
    const { impl } = makeFetchImpl([failHttp()]);
    const client = createRealtimeClient({
      baseUrl: BASE_URL,
      ttlMs: TTL_MS,
      staleAfterMs: STALE_AFTER_MS,
      fetchImpl: impl,
      now: () => START,
    });
    const snapshot = await client.getStopArrivals('S1');
    expect(snapshot.available).toBe(false);
    expect(snapshot.arrivals).toEqual([]);
  });

  it('returns an unavailable snapshot on network error (never throws)', async () => {
    const { impl } = makeFetchImpl([throwError()]);
    const client = createRealtimeClient({
      baseUrl: BASE_URL,
      ttlMs: TTL_MS,
      staleAfterMs: STALE_AFTER_MS,
      fetchImpl: impl,
      now: () => START,
    });
    const snapshot = await client.getStopArrivals('S1');
    expect(snapshot.available).toBe(false);
    expect(snapshot.arrivals).toEqual([]);
  });

  it('flags an unknown stop (404) so the caller can retry the legacy id', async () => {
    const { impl } = makeFetchImpl([notFound()]);
    const client = createRealtimeClient({
      baseUrl: BASE_URL,
      ttlMs: TTL_MS,
      staleAfterMs: STALE_AFTER_MS,
      fetchImpl: impl,
      now: () => START,
    });
    const snapshot = await client.getStopArrivals('320001');
    expect(snapshot.available).toBe(false);
    expect(snapshot.unknownStop).toBe(true);
  });

  it('reports staleness once data is older than the staleness budget', async () => {
    let current = START.getTime();
    const { impl } = makeFetchImpl([okJson(ARRIVALS)]);
    const client = createRealtimeClient({
      baseUrl: BASE_URL,
      ttlMs: TTL_MS,
      staleAfterMs: STALE_AFTER_MS,
      fetchImpl: impl,
      now: () => new Date(current),
    });

    await client.getStopArrivals('S1');
    const status = await client.getStatus();
    expect(status.available).toBe(true);
    expect(status.stale).toBe(false);

    current += STALE_AFTER_MS + 1;
    const stale = await client.getStatus();
    expect(stale.available).toBe(false);
    expect(stale.stale).toBe(true);
    expect(stale.lastUpdate).not.toBeNull();
  });

  it('reports unavailable before any successful fetch', async () => {
    const { impl } = makeFetchImpl([okJson(ARRIVALS)]);
    const client = createRealtimeClient({
      baseUrl: BASE_URL,
      ttlMs: TTL_MS,
      staleAfterMs: STALE_AFTER_MS,
      fetchImpl: impl,
      now: () => START,
    });
    const status = await client.getStatus();
    expect(status).toEqual({ lastUpdate: null, available: false, stale: false });
  });
});

describe('realtime client — URL construction', () => {
  it('requests the per-stop arrivals endpoint', async () => {
    const urls: string[] = [];
    const { impl } = makeFetchImpl([okJson([])], (url) => urls.push(url));
    const client = createRealtimeClient({
      baseUrl: BASE_URL,
      ttlMs: TTL_MS,
      staleAfterMs: STALE_AFTER_MS,
      fetchImpl: impl,
      now: () => START,
    });
    await client.getStopArrivals('050418');
    expect(urls[0]).toBe(`${BASE_URL}/arrivals/by_stop/050418`);
  });
});
