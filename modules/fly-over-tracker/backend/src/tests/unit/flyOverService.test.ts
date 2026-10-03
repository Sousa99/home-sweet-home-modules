import { describe, expect, it } from 'vitest';
import type { AircraftFeed } from '../../feeds/types';
import type { FlightRouteFeed } from '../../feeds/types';
import { MockFeed } from '../../feeds/mock';
import { MockRouteFeed } from '../../feeds/mockRoutes';
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

describe('flyOverService snapshot cache', () => {
  function countingFeed() {
    let calls = 0;
    const feed: AircraftFeed = {
      getSnapshot: async () => {
        calls++;
        return new MockFeed().getSnapshot(CDG.lat, CDG.lng, 50);
      },
    };
    return { feed, getCalls: () => calls };
  }

  it('coalesces overlapping location queries onto one feed call within the TTL', async () => {
    const { feed, getCalls } = countingFeed();
    const service = createFlyOverService(feed, undefined, { snapshotCacheTtlMs: 60_000 });

    await service.query({ ...CDG, radiusKm: 50 });
    await service.query({ ...CDG, radiusKm: 50 });
    expect(getCalls()).toBe(1);
  });

  it('keeps distinct locations in separate cache entries', async () => {
    const { feed, getCalls } = countingFeed();
    const service = createFlyOverService(feed, undefined, { snapshotCacheTtlMs: 60_000 });

    await service.query({ ...CDG, radiusKm: 50 });
    await service.query({ ...CDG, radiusKm: 100 });
    expect(getCalls()).toBe(2);
  });

  it('re-fetches from the feed after the snapshot TTL expires', async () => {
    const { feed, getCalls } = countingFeed();
    const service = createFlyOverService(feed, undefined, { snapshotCacheTtlMs: 10 });

    await service.query({ ...CDG, radiusKm: 50 });
    await new Promise((resolve) => setTimeout(resolve, 30));
    await service.query({ ...CDG, radiusKm: 50 });
    expect(getCalls()).toBe(2);
  });
});

describe('flyOverService destination enrichment', () => {
  it('fills origin and destination for every matched aircraft with complete enrichment', async () => {
    const service = createFlyOverService(new MockFeed(), new MockRouteFeed());
    const result = await service.query({ ...CDG, radiusKm: 50 });

    expect(result.destinationEnrichment).toBe('complete');
    expect(result.aircraft).toHaveLength(3);
    for (const aircraft of result.aircraft) {
      expect(aircraft.originAirport).not.toBeNull();
      expect(aircraft.originCity).not.toBeNull();
      expect(aircraft.originCountry).not.toBeNull();
      expect(aircraft.destinationAirport).not.toBeNull();
      expect(aircraft.destinationCity).not.toBeNull();
      expect(aircraft.destinationCountry).not.toBeNull();
    }
    expect(result.aircraft[0]).toMatchObject({
      callsign: 'DLH400',
      originAirport: 'LFPG',
      originCity: 'Paris',
      originCountry: 'France',
      destinationAirport: 'EDDF',
      destinationCity: 'Frankfurt-am-Main',
      destinationCountry: 'Germany',
    });
  });

  it('reports partial enrichment and null routes when a lookup fails', async () => {
    const failingRoutes: FlightRouteFeed = {
      resolveRoutes: async () => {
        throw new FeedUnavailableError('route lookup rate limited', { retryable: true });
      },
    };
    const service = createFlyOverService(new MockFeed(), failingRoutes);
    const result = await service.query({ ...CDG, radiusKm: 50 });

    expect(result.destinationEnrichment).toBe('partial');
    expect(result.aircraft).toHaveLength(3);
    for (const aircraft of result.aircraft) {
      expect(aircraft.originAirport).toBeNull();
      expect(aircraft.originCity).toBeNull();
      expect(aircraft.originCountry).toBeNull();
      expect(aircraft.destinationAirport).toBeNull();
      expect(aircraft.destinationCity).toBeNull();
      expect(aircraft.destinationCountry).toBeNull();
    }
  });

  it('reports unavailable enrichment when no route feed is provided', async () => {
    const service = createFlyOverService(new MockFeed());
    const result = await service.query({ ...CDG, radiusKm: 50 });

    expect(result.destinationEnrichment).toBe('unavailable');
    for (const aircraft of result.aircraft) {
      expect(aircraft.originAirport).toBeNull();
      expect(aircraft.destinationAirport).toBeNull();
    }
  });

  it('reuses cached routes across queries (no repeat lookups)', async () => {
    const routes = new MockRouteFeed();
    const service = createFlyOverService(new MockFeed(), routes);

    await service.query({ ...CDG, radiusKm: 50 });
    expect(routes.callCount).toBe(1);
    await service.query({ ...CDG, radiusKm: 50 });
    expect(routes.callCount).toBe(1);
  });

  it('reports complete enrichment for an empty result', async () => {
    const service = createFlyOverService(new MockFeed(), new MockRouteFeed());
    const result = await service.query({ ...CDG, radiusKm: 1 });
    expect(result.destinationEnrichment).toBe('complete');
    expect(result.aircraft).toEqual([]);
  });
});
