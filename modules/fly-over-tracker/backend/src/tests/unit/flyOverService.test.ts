import { describe, expect, it } from 'vitest';
import type { AircraftFeed } from '../../feeds/types';
import { MockFeed } from '../../feeds/mock';
import { FeedUnavailableError, ValidationError } from '../../lib/errors';
import { createFlyOverService } from '../../services/flyOverService';

const CDG = { lat: 48.8566, lng: 2.3522 };

describe('flyOverService', () => {
  it('returns aircraft within the radius, sorted by distance ascending', async () => {
    const service = createFlyOverService(new MockFeed());
    const result = await service.query({ ...CDG, radiusKm: 50 });

    expect(result.center).toEqual(CDG);
    expect(result.radiusKm).toBe(50);
    expect(result.asOf).toBe(1_726_900_000);
    expect(result.count).toBe(3);
    expect(result.aircraft).toHaveLength(3);

    const distances = result.aircraft.map((a) => a.distanceKm);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
    for (const aircraft of result.aircraft) {
      expect(aircraft.distanceKm).toBeLessThanOrEqual(50);
      expect(aircraft.callsign).not.toBeNull();
      expect(typeof aircraft.icao24).toBe('string');
    }
    expect(result.aircraft[0]?.callsign).toBe('DLH400');
  });

  it('excludes aircraft outside the radius', async () => {
    const service = createFlyOverService(new MockFeed());
    const result = await service.query({ ...CDG, radiusKm: 50 });
    const callsigns = result.aircraft.map((a) => a.callsign);
    expect(callsigns).not.toContain('UAL789');
    expect(callsigns).not.toContain('KLM999');
  });

  it('returns an empty result for a tiny radius', async () => {
    const service = createFlyOverService(new MockFeed());
    const result = await service.query({ ...CDG, radiusKm: 1 });
    expect(result.count).toBe(0);
    expect(result.aircraft).toEqual([]);
    expect(result.asOf).toBe(1_726_900_000);
  });

  it('re-validates input and rejects invalid queries', async () => {
    const service = createFlyOverService(new MockFeed());
    await expect(service.query({ lat: 91, lng: 0, radiusKm: 50 })).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(service.query({ ...CDG, radiusKm: -5 })).rejects.toBeInstanceOf(ValidationError);
  });

  it('propagates feed errors', async () => {
    const failingFeed: AircraftFeed = {
      getSnapshot: async () => {
        throw new FeedUnavailableError('feed is down');
      },
    };
    const service = createFlyOverService(failingFeed);
    await expect(service.query({ ...CDG, radiusKm: 50 })).rejects.toBeInstanceOf(
      FeedUnavailableError,
    );
  });
});
