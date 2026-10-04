import { describe, expect, it } from 'vitest';
import { MockLocationFeed, MockWeatherFeed } from '../../feeds/mock';
import { createApp } from '../../http/app';
import { createLogger } from '../../lib/logger';
import { createWeatherService } from '../../services/weatherService';

const app = createApp({
  service: createWeatherService({
    weatherFeed: new MockWeatherFeed(),
    locationFeed: new MockLocationFeed(),
  }),
  logger: createLogger({ env: 'test' }),
});

describe('REST endpoints', () => {
  it('GET /api/health returns 200 with the service name', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, service: 'weather-psychic' });
  });

  it('GET /api/weather returns a 200 forecast shape', async () => {
    const res = await app.request('/api/weather?lat=38.7167&lng=-9.1333');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      location: { name: string };
      current: { condition: string };
      hourly: unknown[];
      daily: unknown[];
      generatedAt: string;
    };
    expect(body.location.name).toBe('Lisbon');
    expect(body.current.condition).toBe('Partly cloudy');
    expect(body.hourly.length).toBeGreaterThan(0);
    expect(body.daily.length).toBeGreaterThan(0);
    expect(body.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('GET /api/locations/search returns matching results', async () => {
    const res = await app.request('/api/locations/search?query=lisbon');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { results: Array<{ name: string }> };
    expect(body.results.length).toBeGreaterThan(0);
    expect(body.results[0]?.name).toBe('Lisbon');
  });

  it('returns 400 for an invalid weather query', async () => {
    const res = await app.request('/api/weather?lat=abc&lng=0');
    expect(res.status).toBe(400);
    const body = (await res.json()) as { success: false; message: string };
    expect(body.success).toBe(false);
    expect(body.message).toBe('Invalid forecast query');
  });

  it('returns 400 for a too-short location query', async () => {
    const res = await app.request('/api/locations/search?query=a');
    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown path', async () => {
    const res = await app.request('/api/nope');
    expect(res.status).toBe(404);
  });
});
