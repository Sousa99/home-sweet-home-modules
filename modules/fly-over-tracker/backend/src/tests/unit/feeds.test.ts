import { describe, expect, it } from 'vitest';
import { FeedUnavailableError } from '../../lib/errors';
import { MockFeed } from '../../feeds/mock';
import { AdsbLolFeed, mapAdsbLolResponse } from '../../feeds/adsbLol';

const CDG = { lat: 48.8566, lng: 2.3522 };

const rawAircraft = {
  hex: '3c6444',
  type: 'adsb_icao',
  flight: 'DLH400 ',
  alt_baro: 30000,
  gs: 251.2,
  track: 87.5,
  baro_rate: 0,
  lat: 48.9211,
  lon: 2.4288,
};

describe('mapAdsbLolResponse', () => {
  it('maps an adsb.lol aircraft to a FeedState with unit conversions', () => {
    const snapshot = mapAdsbLolResponse({ ac: [rawAircraft], now: 1_726_900_000_000 }, 0);
    expect(snapshot.time).toBe(1_726_900_000);
    const state = snapshot.states[0]!;
    expect(state).toMatchObject({
      icao24: '3c6444',
      callsign: 'DLH400',
      originCountry: null,
      longitude: 2.4288,
      latitude: 48.9211,
      // 30000 ft → m
      baroAltitude: 9144,
      onGround: false,
      trueTrack: 87.5,
      verticalRate: 0.0,
    });
    // 251.2 kt → m/s
    expect(state.velocity).toBeCloseTo(129.23, 2);
  });

  it('maps a string ground altitude to onGround with no baro altitude', () => {
    const snapshot = mapAdsbLolResponse(
      {
        ac: [{ ...rawAircraft, alt_baro: 'ground', gs: 0, baro_rate: null }],
        now: 1,
      },
      0,
    );
    const state = snapshot.states[0]!;
    expect(state.onGround).toBe(true);
    expect(state.baroAltitude).toBeNull();
  });

  it('treats a low ground speed as on the ground', () => {
    const snapshot = mapAdsbLolResponse({ ac: [{ ...rawAircraft, alt_baro: 100, gs: 3 }] }, 0);
    expect(snapshot.states[0]?.onGround).toBe(true);
  });

  it('filters ~-prefixed non-ICAO addresses and empty hex values', () => {
    const snapshot = mapAdsbLolResponse(
      {
        ac: [{ ...rawAircraft, hex: '~abc123' }, { ...rawAircraft, hex: '' }, rawAircraft],
      },
      0,
    );
    expect(snapshot.states).toHaveLength(1);
    expect(snapshot.states[0]?.icao24).toBe('3c6444');
  });

  it('maps nulls and empty callsigns to null', () => {
    const snapshot = mapAdsbLolResponse(
      { ac: [{ ...rawAircraft, flight: '   ', gs: null, track: null }] },
      0,
    );
    const state = snapshot.states[0]!;
    expect(state.callsign).toBeNull();
    expect(state.velocity).toBeNull();
    expect(state.trueTrack).toBeNull();
  });

  it('uses the fallback time when the payload has no clock', () => {
    const snapshot = mapAdsbLolResponse({ ac: [] }, 42);
    expect(snapshot).toEqual({ time: 42, states: [] });
  });

  it('rejects malformed payloads', () => {
    expect(() => mapAdsbLolResponse('nope', 0)).toThrow(FeedUnavailableError);
    expect(() => mapAdsbLolResponse({}, 0)).toThrow(FeedUnavailableError);
    expect(() => mapAdsbLolResponse({ ac: 'nope' }, 0)).toThrow(FeedUnavailableError);
  });
});

describe('AdsbLolFeed', () => {
  const noWait = async () => {};

  it('queries /v2/point with the radius converted to nautical miles', async () => {
    let capturedUrl: URL | undefined;
    const feed = new AdsbLolFeed({
      baseUrl: 'https://example.com',
      fetchImpl: async (input) => {
        capturedUrl = input instanceof URL ? input : new URL(String(input));
        return new Response(JSON.stringify({ ac: [rawAircraft], now: 1 }), { status: 200 });
      },
    });
    const snapshot = await feed.getSnapshot(CDG.lat, CDG.lng, 50);
    expect(capturedUrl?.pathname).toBe('/v2/point/48.8566/2.3522/27');
    expect(snapshot.states).toHaveLength(1);
  });

  it('sends a descriptive User-Agent (adsb.lol rejects generic ones with 403)', async () => {
    const userAgents: string[] = [];
    const feed = new AdsbLolFeed({
      baseUrl: 'https://example.com',
      fetchImpl: async (_input, init) => {
        userAgents.push(String((init?.headers as Record<string, string>)['user-agent'] ?? ''));
        return new Response(JSON.stringify({ ac: [rawAircraft], now: 1 }), { status: 200 });
      },
    });
    await feed.getSnapshot(CDG.lat, CDG.lng, 50);
    expect(userAgents).toEqual([expect.stringMatching(/^fly-over-tracker\//)]);
  });

  it('rounds a sub-nm radius up to 1 nm', async () => {
    let capturedUrl: URL | undefined;
    const feed = new AdsbLolFeed({
      baseUrl: 'https://example.com',
      fetchImpl: async (input) => {
        capturedUrl = input instanceof URL ? input : new URL(String(input));
        return new Response(JSON.stringify({ ac: [], now: 1 }), { status: 200 });
      },
    });
    await feed.getSnapshot(CDG.lat, CDG.lng, 0.5);
    expect(capturedUrl?.pathname.endsWith('/1')).toBe(true);
  });

  it('retries on 429 honoring the retry-after header, then succeeds', async () => {
    const waits: number[] = [];
    let calls = 0;
    const feed = new AdsbLolFeed({
      baseUrl: 'https://example.com',
      attempts: 3,
      wait: async (ms) => {
        waits.push(ms);
      },
      fetchImpl: async () => {
        calls += 1;
        if (calls === 1) {
          return new Response('{}', {
            status: 429,
            headers: { 'X-Rate-Limit-Retry-After-Seconds': '2' },
          });
        }
        return new Response(JSON.stringify({ ac: [rawAircraft], now: 1 }), { status: 200 });
      },
    });
    const snapshot = await feed.getSnapshot(CDG.lat, CDG.lng, 50);
    expect(snapshot.states).toHaveLength(1);
    expect(calls).toBe(2);
    expect(waits).toEqual([2000]);
  });

  it('throws a rate-limited error after bounded 429 attempts', async () => {
    let calls = 0;
    const feed = new AdsbLolFeed({
      baseUrl: 'https://example.com',
      attempts: 2,
      wait: noWait,
      fetchImpl: async () => {
        calls += 1;
        return new Response('{}', { status: 429 });
      },
    });
    await expect(feed.getSnapshot(CDG.lat, CDG.lng, 50)).rejects.toMatchObject({
      code: 'rate_limited',
      status: 503,
    });
    expect(calls).toBe(2);
  });

  it('maps other HTTP errors to a feed error (502)', async () => {
    const feed = new AdsbLolFeed({
      fetchImpl: async () => new Response('{}', { status: 500 }),
    });
    await expect(feed.getSnapshot(CDG.lat, CDG.lng, 50)).rejects.toMatchObject({
      code: 'feed_unavailable',
      status: 502,
    });
  });

  it('maps network failures to a retryable feed error (503)', async () => {
    const feed = new AdsbLolFeed({
      fetchImpl: async () => {
        throw new Error('network down');
      },
    });
    await expect(feed.getSnapshot(CDG.lat, CDG.lng, 50)).rejects.toMatchObject({
      code: 'rate_limited',
      status: 503,
    });
  });

  it('maps an unreadable payload to a feed error (502)', async () => {
    const feed = new AdsbLolFeed({
      fetchImpl: async () => new Response('<html>not json</html>', { status: 200 }),
    });
    await expect(feed.getSnapshot(CDG.lat, CDG.lng, 50)).rejects.toMatchObject({
      code: 'feed_unavailable',
      status: 502,
    });
  });
});

describe('MockFeed', () => {
  it('returns only states inside the circle', async () => {
    const feed = new MockFeed();
    const snapshot = await feed.getSnapshot(CDG.lat, CDG.lng, 50);
    const callsigns = snapshot.states.map((s) => s.callsign);
    expect(callsigns).toEqual(['DLH400', 'AFR123', 'BAW456']);
  });

  it('returns no states for a tiny radius', async () => {
    const feed = new MockFeed();
    const snapshot = await feed.getSnapshot(CDG.lat, CDG.lng, 1);
    expect(snapshot.states).toHaveLength(0);
  });

  it('keeps a deterministic time', async () => {
    const feed = new MockFeed();
    const snapshot = await feed.getSnapshot(CDG.lat, CDG.lng, 50);
    expect(snapshot.time).toBe(1_726_900_000);
  });
});
