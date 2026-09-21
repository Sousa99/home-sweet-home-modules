import { describe, expect, it } from 'vitest';
import { AdsbRouteFeed, mapAdsbRouteResponse } from '../../feeds/adsbRoutes';
import { FeedUnavailableError } from '../../lib/errors';

const ROUTE = {
  callsign: 'DLH400',
  number: '400',
  airline_code: 'DLH',
  airport_codes: 'LFPG-EDDF',
  _airports: [
    { icao: 'LFPG', iata: 'CDG', location: 'Paris', countryiso2: 'FR', name: 'Paris CDG' },
    {
      icao: 'EDDF',
      iata: 'FRA',
      location: 'Frankfurt',
      countryiso2: 'DE',
      name: 'Frankfurt Airport',
    },
  ],
};

const LOOKUPS = [
  { icao24: '3c6444', callsign: 'DLH400', latitude: 48.9211, longitude: 2.4288 },
  { icao24: '3946b0', callsign: 'AFR123', latitude: 48.9211, longitude: 2.4288 },
] as const;

describe('mapAdsbRouteResponse', () => {
  it('maps departure and arrival airport metadata from a route file', () => {
    expect(mapAdsbRouteResponse(ROUTE, '3c6444')).toEqual({
      icao24: '3c6444',
      estDepartureAirport: {
        icao: 'LFPG',
        city: 'Paris',
        name: 'Paris CDG',
        countryIso2: 'FR',
      },
      estArrivalAirport: {
        icao: 'EDDF',
        city: 'Frankfurt',
        name: 'Frankfurt Airport',
        countryIso2: 'DE',
      },
    });
  });

  it('maps null for an unknown route', () => {
    expect(mapAdsbRouteResponse({ ...ROUTE, airport_codes: 'unknown' }, '3c6444')).toBeNull();
  });

  it('maps null for a route with fewer than two airports', () => {
    expect(mapAdsbRouteResponse({ ...ROUTE, _airports: [{ icao: 'LFPG' }] }, '3c6444')).toBeNull();
  });

  it('throws a feed error for a malformed payload', () => {
    expect(() => mapAdsbRouteResponse('nope', '3c6444')).toThrow(FeedUnavailableError);
    expect(() => mapAdsbRouteResponse([], '3c6444')).toThrow(FeedUnavailableError);
  });

  it('maps an object without route data to null', () => {
    expect(mapAdsbRouteResponse({ time: 1 }, '3c6444')).toBeNull();
  });
});

describe('AdsbRouteFeed', () => {
  it('fetches the standing-data route file per callsign with a User-Agent', async () => {
    const urls: string[] = [];
    const userAgents: string[] = [];
    const feed = new AdsbRouteFeed({
      baseUrl: 'https://example.com',
      fetchImpl: async (input, init) => {
        urls.push(input instanceof URL ? input.toString() : String(input));
        userAgents.push(String((init?.headers as Record<string, string>)['user-agent'] ?? ''));
        return new Response(JSON.stringify(ROUTE), { status: 200 });
      },
    });

    const result = await feed.resolveRoutes(LOOKUPS);
    expect(urls).toEqual([
      'https://example.com/routes/DL/DLH400.json',
      'https://example.com/routes/AF/AFR123.json',
    ]);
    for (const ua of userAgents) {
      expect(ua).toMatch(/^fly-over-tracker\//);
    }
    expect(result.get('3c6444')).toMatchObject({
      icao24: '3c6444',
      estDepartureAirport: { icao: 'LFPG' },
      estArrivalAirport: { icao: 'EDDF' },
    });
    expect(result.get('3946b0')).not.toBeNull();
  });

  it('maps a 404 for an unknown callsign to null without failing the batch', async () => {
    const feed = new AdsbRouteFeed({
      baseUrl: 'https://example.com',
      fetchImpl: async () => new Response('', { status: 404 }),
    });
    const result = await feed.resolveRoutes(LOOKUPS);
    expect(result.get('3c6444')).toBeNull();
    expect(result.get('3946b0')).toBeNull();
  });

  it('skips lookups without a callsign and still returns null for them', async () => {
    let calls = 0;
    const feed = new AdsbRouteFeed({
      baseUrl: 'https://example.com',
      fetchImpl: async () => {
        calls += 1;
        return new Response(JSON.stringify(ROUTE), { status: 200 });
      },
    });
    const lookups = [{ icao24: 'abc', callsign: null, latitude: 0, longitude: 0 }, ...LOOKUPS];
    const result = await feed.resolveRoutes(lookups);
    expect(result.get('abc')).toBeNull();
    expect(calls).toBe(2);
  });

  it('returns an empty map for an empty batch without a request', async () => {
    let calls = 0;
    const feed = new AdsbRouteFeed({
      baseUrl: 'https://example.com',
      fetchImpl: async () => {
        calls += 1;
        return new Response('[]', { status: 200 });
      },
    });
    const result = await feed.resolveRoutes([]);
    expect(result.size).toBe(0);
    expect(calls).toBe(0);
  });

  it('retries on 429 (honoring retry-after) and succeeds', async () => {
    const waits: number[] = [];
    let calls = 0;
    const feed = new AdsbRouteFeed({
      baseUrl: 'https://example.com',
      attempts: 3,
      wait: async (ms) => {
        waits.push(ms);
      },
      fetchImpl: async () => {
        calls += 1;
        if (calls === 1) {
          return new Response('', {
            status: 429,
            headers: { 'X-Rate-Limit-Retry-After-Seconds': '1' },
          });
        }
        return new Response(JSON.stringify(ROUTE), { status: 200 });
      },
    });

    const result = await feed.resolveRoutes([LOOKUPS[0]]);
    expect(result.get('3c6444')).not.toBeNull();
    expect(calls).toBe(2);
    expect(waits).toEqual([1000]);
  });

  it('throws a feed error for other HTTP errors', async () => {
    const feed = new AdsbRouteFeed({
      baseUrl: 'https://example.com',
      fetchImpl: async () => new Response('', { status: 500 }),
    });
    await expect(feed.resolveRoutes([LOOKUPS[0]])).rejects.toMatchObject({
      code: 'feed_unavailable',
      status: 502,
    });
  });

  it('maps a malformed 200 payload to a feed error', async () => {
    const feed = new AdsbRouteFeed({
      baseUrl: 'https://example.com',
      fetchImpl: async () => new Response('<html>not json</html>', { status: 200 }),
    });
    await expect(feed.resolveRoutes([LOOKUPS[0]])).rejects.toMatchObject({
      code: 'feed_unavailable',
      status: 502,
    });
  });
});
