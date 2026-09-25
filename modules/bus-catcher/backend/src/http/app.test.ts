import { describe, expect, it } from 'vitest';
import { createTestBackend, seedTestFeed } from '../test-utils/db';
import { createScheduleService } from '../services/schedule';
import type { RefreshService } from '../services/refresh';
import type { LiveEtaProvider, RealtimeSnapshot } from '../providers/types';
import { dateToServiceDay, minutesToDate } from '../lib/time';
import { createApp } from './app';

const refreshStub: RefreshService = {
  refresh: () => ({ status: 'started' }),
  isRefreshing: () => false,
  whenIdle: async () => {},
};

function stubRealtime(
  snapshot: RealtimeSnapshot,
  status: { lastUpdate: string | null; available: boolean; stale: boolean } = {
    lastUpdate: null,
    available: false,
    stale: false,
  },
): LiveEtaProvider {
  return {
    getStopArrivals: async () => snapshot,
    getStatus: async () => status,
  };
}

function setup() {
  const backend = createTestBackend();
  seedTestFeed(backend);
  const app = createApp({
    provider: backend.provider,
    config: backend.config,
    schedule: createScheduleService(backend.provider),
    refresh: refreshStub,
  });
  return { app, backend };
}

function setupWithRealtime(snapshot: RealtimeSnapshot) {
  const backend = createTestBackend();
  seedTestFeed(backend);
  const app = createApp({
    provider: backend.provider,
    config: backend.config,
    schedule: createScheduleService(backend.provider, undefined, stubRealtime(snapshot)),
    refresh: refreshStub,
  });
  return { app, backend };
}

async function json<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

describe('US1 REST contract', () => {
  it('GET /api/health → 200', async () => {
    const { app } = setup();
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, service: 'bus-catcher' });
  });

  it('GET /api/lines → 200 with lines', async () => {
    const { app } = setup();
    const res = await app.request('/api/lines');
    expect(res.status).toBe(200);
    const body = await json<{ lines: Array<{ shortName: string }> }>(res);
    expect(body.lines.map((l) => l.shortName)).toEqual(['706', '736']);
  });

  it('GET /api/stops?q=teste → 200 with stops', async () => {
    const { app } = setup();
    const res = await app.request('/api/stops?q=teste');
    expect(res.status).toBe(200);
    const body = await json<{ stops: Array<{ id: string }> }>(res);
    expect(body.stops.map((s) => s.id).sort()).toEqual(['S1', 'S2']);
  });

  it('GET /api/stops?q=x → 400 (query too short)', async () => {
    const { app } = setup();
    const res = await app.request('/api/stops?q=x');
    expect(res.status).toBe(400);
  });

  it('GET /api/stops/S1 → 200 with serving lines', async () => {
    const { app } = setup();
    const res = await app.request('/api/stops/S1');
    expect(res.status).toBe(200);
    const body = await json<{
      stop: { id: string; lines: Array<{ id: string }> };
    }>(res);
    expect(body.stop.id).toBe('S1');
    expect(body.stop.lines.map((l) => l.id).sort()).toEqual(['L1', 'L2']);
  });

  it('GET /api/stops/NOPE → 404', async () => {
    const { app } = setup();
    expect((await app.request('/api/stops/NOPE')).status).toBe(404);
  });

  it('GET /api/config → 200 empty config', async () => {
    const { app } = setup();
    const res = await app.request('/api/config');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ stops: [] });
  });

  it('POST /api/config/stops → 201 and persists', async () => {
    const { app } = setup();
    const res = await app.request('/api/config/stops', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ stopId: 'S1', lineFilter: ['736'] }),
    });
    expect(res.status).toBe(201);
    const body = await json<{
      stop: { stop: { id: string }; lineFilter: string[] };
    }>(res);
    expect(body.stop.stop.id).toBe('S1');
    expect(body.stop.lineFilter).toEqual(['736']);

    const list = await json<{ stops: unknown[] }>(await app.request('/api/config'));
    expect(list.stops).toHaveLength(1);
  });

  it('POST /api/config/stops duplicate → 409', async () => {
    const { app } = setup();
    const opts = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ stopId: 'S1' }),
    };
    await app.request('/api/config/stops', opts);
    const dup = await app.request('/api/config/stops', opts);
    expect(dup.status).toBe(409);
  });

  it('POST /api/config/stops invalid body → 400', async () => {
    const { app } = setup();
    const res = await app.request('/api/config/stops', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ stopId: '' }),
    });
    expect(res.status).toBe(400);
  });

  it('GET /api/status → 200 with freshness fields', async () => {
    const { app } = setup();
    const res = await app.request('/api/status');
    expect(res.status).toBe(200);
    const body = await json<{
      lastRefresh: string | null;
      feedVersion: string | null;
      stale: boolean;
      refreshing: boolean;
    }>(res);
    expect(body.lastRefresh).toBeNull();
    expect(typeof body.stale).toBe('boolean');
    expect(typeof body.refreshing).toBe('boolean');
  });

  it('POST /api/refresh → 202 with a status', async () => {
    const { app } = setup();
    const res = await app.request('/api/refresh', { method: 'POST' });
    expect(res.status).toBe(202);
    const body = await json<{ status: string }>(res);
    expect(['started', 'in_progress']).toContain(body.status);
  });

  it('GET /api/stops/S1/times → 200 with next times', async () => {
    const { app } = setup();
    const res = await app.request('/api/stops/S1/times?limit=2');
    expect(res.status).toBe(200);
    const body = await json<{ stopId: string; times: Array<{ minutesUntil: number }> }>(res);
    expect(body.stopId).toBe('S1');
    // The seeded fixture only guarantees a stop with service today; how many
    // upcoming buses exist depends on the wall clock, so assert a robust shape.
    expect(body.times.length).toBeGreaterThan(0);
    for (const time of body.times) {
      expect(time.minutesUntil).toBeGreaterThanOrEqual(0);
    }
  });

  it('GET /api/stops/S1/times respects the line filter', async () => {
    const { app } = setup();
    const res = await app.request('/api/stops/S1/times?line=706');
    expect(res.status).toBe(200);
    const body = await json<{ times: unknown[] }>(res);
    expect(body.times).toEqual([]);
  });

  it('GET /api/stops/S1/times?limit=999 → 400', async () => {
    const { app } = setup();
    expect((await app.request('/api/stops/S1/times?limit=999')).status).toBe(400);
  });

  it('GET /api/stops/NOPE/times → 404', async () => {
    const { app } = setup();
    expect((await app.request('/api/stops/NOPE/times')).status).toBe(404);
  });

  it('PUT /api/config/stops/:id updates a configured stop', async () => {
    const { app } = setup();
    await app.request('/api/config/stops', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ stopId: 'S1' }),
    });
    const res = await app.request('/api/config/stops/1', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ enabled: false, lineFilter: ['736'] }),
    });
    expect(res.status).toBe(200);
    const body = await json<{ stop: { enabled: boolean; lineFilter: string[] } }>(res);
    expect(body.stop.enabled).toBe(false);
    expect(body.stop.lineFilter).toEqual(['736']);
  });

  it('PUT /api/config/stops/:id invalid body → 400', async () => {
    const { app } = setup();
    const res = await app.request('/api/config/stops/1', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ displayOrder: 'not-a-number' }),
    });
    expect(res.status).toBe(400);
  });

  it('PUT /api/config/stops/:id unknown line → 400', async () => {
    const { app } = setup();
    await app.request('/api/config/stops', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ stopId: 'S1' }),
    });
    const res = await app.request('/api/config/stops/1', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lineFilter: ['999'] }),
    });
    expect(res.status).toBe(400);
  });

  it('PUT /api/config/stops/999 → 404', async () => {
    const { app } = setup();
    const res = await app.request('/api/config/stops/999', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ enabled: false }),
    });
    expect(res.status).toBe(404);
  });

  it('DELETE /api/config/stops/:id → 204', async () => {
    const { app } = setup();
    await app.request('/api/config/stops', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ stopId: 'S1' }),
    });
    expect((await app.request('/api/config/stops/1', { method: 'DELETE' })).status).toBe(204);
    const list = await json<{ stops: unknown[] }>(await app.request('/api/config'));
    expect(list.stops).toEqual([]);
  });

  it('DELETE /api/config/stops/999 → 404', async () => {
    const { app } = setup();
    expect((await app.request('/api/config/stops/999', { method: 'DELETE' })).status).toBe(404);
  });

  it('GET /api/config flags a stop that vanished from the feed', async () => {
    const { app, backend } = setup();
    await app.request('/api/config/stops', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ stopId: 'S1' }),
    });
    // simulate a refreshed feed that dropped stop S1 (ingest runs with FK off)
    backend.sqlite.pragma('foreign_keys = OFF');
    backend.sqlite.prepare('DELETE FROM stops WHERE id = ?').run('S1');

    const res = await app.request('/api/config');
    expect(res.status).toBe(200);
    const body = await json<{
      stops: Array<{ id: number; missing?: boolean; stop: { id: string } }>;
    }>(res);
    expect(body.stops).toHaveLength(1);
    expect(body.stops[0]!.missing).toBe(true);
    expect(body.stops[0]!.stop.id).toBe('S1');
  });
});

describe('US1/US2/US4 realtime REST contract', () => {
  it('GET /api/stops/S1/times returns enriched live rows and a realtime block', async () => {
    // The route always evaluates against wall-clock now, so predict the one
    // fixture trip that is always upcoming regardless of when tests run: T4
    // (~01:00 the following service day).
    const now = new Date();
    const serviceDay = dateToServiceDay(now);
    const t4Scheduled = minutesToDate(1500, serviceDay);
    const t4Predicted = new Date(t4Scheduled.getTime() + 4 * 60_000);

    const { app } = setupWithRealtime({
      arrivals: [
        {
          tripId: 'rt-T4',
          stopId: 'S1',
          lineId: '736',
          headsign: 'Cais',
          directionId: 0,
          estimatedAt: t4Predicted.getTime(),
          scheduledAt: t4Scheduled.getTime(),
          fetchedAt: 0,
        },
      ],
      fetchedAt: now.getTime(),
      available: true,
    });
    const res = await app.request('/api/stops/S1/times?limit=2');
    expect(res.status).toBe(200);
    const body = await json<{
      times: Array<{ source?: string; delayMinutes?: number | null }>;
      realtime: { available: boolean; liveCount: number; totalCount: number };
    }>(res);
    const live = body.times.find((t) => t.source === 'live');
    expect(live).toBeDefined();
    expect(live?.delayMinutes).toBe(4);
    expect(body.realtime.available).toBe(true);
    expect(body.realtime.liveCount).toBe(1);
    expect(body.realtime.totalCount).toBe(body.times.length);
  });

  it('GET /api/stops/S1/times degrades to schedule-only when the feed is down (no 5xx)', async () => {
    const { app } = setupWithRealtime({
      arrivals: [],
      fetchedAt: Date.parse('2026-06-15T10:30:00.000Z'),
      available: false,
    });
    const res = await app.request('/api/stops/S1/times?limit=2');
    expect(res.status).toBe(200);
    const body = await json<{
      times: Array<{ source?: string }>;
      realtime: { available: boolean; liveCount: number };
    }>(res);
    expect(body.realtime.available).toBe(false);
    for (const t of body.times) expect(t.source).toBeUndefined();
  });

  it('GET /api/status returns realtime freshness fields', async () => {
    const backend = createTestBackend();
    seedTestFeed(backend);
    const app = createApp({
      provider: backend.provider,
      config: backend.config,
      schedule: createScheduleService(
        backend.provider,
        undefined,
        stubRealtime(
          { arrivals: [], fetchedAt: 0, available: true },
          { lastUpdate: '2026-06-15T10:30:00.000Z', available: true, stale: false },
        ),
      ),
      refresh: refreshStub,
    });
    const res = await app.request('/api/status');
    expect(res.status).toBe(200);
    const body = await json<{
      realtimeLastUpdate?: string | null;
      realtimeAvailable?: boolean;
      realtimeStale?: boolean;
    }>(res);
    expect(body.realtimeLastUpdate).toBe('2026-06-15T10:30:00.000Z');
    expect(body.realtimeAvailable).toBe(true);
    expect(body.realtimeStale).toBe(false);
  });
});
