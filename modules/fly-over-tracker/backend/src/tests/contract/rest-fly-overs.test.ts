import { describe, expect, it } from 'vitest';
import { MockFeed } from '../../feeds/mock';
import { createApp } from '../../http/app';
import { FeedUnavailableError } from '../../lib/errors';
import { createLogger } from '../../lib/logger';
import type { FlyOverResult } from '../../domain/types';
import { createFlyOverService } from '../../services/flyOverService';
import type { FlyOverService } from '../../services/flyOverService';

function testApp(service: FlyOverService) {
  return createApp({ service, logger: createLogger({ env: 'test' }) });
}

const service = createFlyOverService(new MockFeed());
const app = testApp(service);

describe('GET /api/fly-overs (REST contract)', () => {
  it('returns a 200 FlyOverResult for a valid query', async () => {
    const res = await app.request('/api/fly-overs?lat=48.8566&lng=2.3522&radiusKm=50');
    expect(res.status).toBe(200);
    const body = (await res.json()) as FlyOverResult;

    expect(body).toMatchObject({
      center: { lat: 48.8566, lng: 2.3522 },
      radiusKm: 50,
      count: 3,
    });
    expect(typeof body.asOf).toBe('number');
    expect(body.aircraft).toHaveLength(3);
    const [first] = body.aircraft;
    expect(first).toMatchObject({
      icao24: '3c6444',
      callsign: 'DLH400',
      distanceKm: expect.any(Number),
    });
  });

  it('returns 400 with per-field errors for out-of-range input', async () => {
    const res = await app.request('/api/fly-overs?lat=999&lng=2.3522&radiusKm=50');
    expect(res.status).toBe(400);
    const body = (await res.json()) as { success: boolean; errors: Array<{ field: string }> };
    expect(body.success).toBe(false);
    expect(body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'lat' })]),
    );
  });

  it('returns 400 for missing parameters', async () => {
    const res = await app.request('/api/fly-overs?lat=48.8566&lng=2.3522');
    expect(res.status).toBe(400);
  });

  it('returns 502 when the feed fails', async () => {
    const failing: FlyOverService = {
      query: async () => {
        throw new FeedUnavailableError('feed is down');
      },
    };
    const res = await testApp(failing).request('/api/fly-overs?lat=48.8566&lng=2.3522&radiusKm=50');
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({
      success: false,
      message: 'feed is down',
    });
  });

  it('returns 503 when the feed is rate limited', async () => {
    const failing: FlyOverService = {
      query: async () => {
        throw new FeedUnavailableError('rate limited', { retryable: true });
      },
    };
    const res = await testApp(failing).request('/api/fly-overs?lat=48.8566&lng=2.3522&radiusKm=50');
    expect(res.status).toBe(503);
  });

  it('returns 404 for unknown routes', async () => {
    const res = await app.request('/api/nope');
    expect(res.status).toBe(404);
  });
});
