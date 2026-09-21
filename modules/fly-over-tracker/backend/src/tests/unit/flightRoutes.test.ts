import { describe, expect, it } from 'vitest';
import { OAuth2TokenManager } from '../../feeds/openskyAuth';
import {
  OpenSkyFlightRouteFeed,
  mapFlightRouteResponse,
  startOfUtcDay,
} from '../../feeds/flightRoutes';
import { FeedUnavailableError } from '../../lib/errors';

const ICAO24 = '3c6444';
const NOW = 1_726_900_000;
const START_OF_DAY = 1_726_876_800;

const flight = {
  icao24: ICAO24,
  firstSeen: 1_726_899_000,
  estDepartureAirport: 'LFPG',
  lastSeen: 1_726_903_600,
  estArrivalAirport: 'EDDF',
  callsign: 'DLH400',
};

const expectedInfo = {
  icao24: ICAO24,
  estDepartureAirport: 'LFPG',
  estArrivalAirport: 'EDDF',
};

describe('startOfUtcDay', () => {
  it('returns the UTC midnight at or before the timestamp', () => {
    expect(startOfUtcDay(NOW)).toBe(START_OF_DAY);
    expect(startOfUtcDay(START_OF_DAY)).toBe(START_OF_DAY);
  });
});

describe('mapFlightRouteResponse', () => {
  it('picks the flight whose interval covers "now"', () => {
    expect(mapFlightRouteResponse([flight], ICAO24, 1_726_902_000)).toEqual(expectedInfo);
  });

  it('falls back to the most recent flight when none covers "now"', () => {
    const newer = { ...flight, lastSeen: 1_726_901_000, estArrivalAirport: 'EGLL' };
    const older = { ...flight, lastSeen: 1_726_897_000, estArrivalAirport: 'EDDF' };
    expect(mapFlightRouteResponse([older, newer], ICAO24, NOW)).toEqual({
      ...expectedInfo,
      estArrivalAirport: 'EGLL',
    });
  });

  it('matches icao24 case-insensitively and filters others', () => {
    const other = { ...flight, icao24: '4caa01', estArrivalAirport: 'EGLL' };
    expect(mapFlightRouteResponse([other, flight], ICAO24.toUpperCase(), NOW)).toEqual(
      expectedInfo,
    );
  });

  it('preserves null airports', () => {
    const noArrival = { ...flight, estArrivalAirport: null, estDepartureAirport: null };
    expect(mapFlightRouteResponse([noArrival], ICAO24, NOW)).toEqual({
      icao24: ICAO24,
      estDepartureAirport: null,
      estArrivalAirport: null,
    });
  });

  it('returns null for an empty result or no matching aircraft', () => {
    expect(mapFlightRouteResponse([], ICAO24, NOW)).toBeNull();
    expect(mapFlightRouteResponse([flight], 'zzzzzz', NOW)).toBeNull();
  });

  it('throws a feed error for a malformed payload', () => {
    expect(() => mapFlightRouteResponse('nope', ICAO24, NOW)).toThrow(FeedUnavailableError);
    expect(() => mapFlightRouteResponse({ time: 1 }, ICAO24, NOW)).toThrow(FeedUnavailableError);
  });
});

function feedWithAuth() {
  const tokenManager = new OAuth2TokenManager({
    clientId: 'cid',
    clientSecret: 'csec',
    tokenUrl: 'https://auth.example.com/token',
    fetchImpl: async () =>
      new Response(JSON.stringify({ access_token: 'tok-x', expires_in: 1800 }), { status: 200 }),
  });
  return tokenManager;
}

describe('OpenSkyFlightRouteFeed', () => {
  it('queries /flights/aircraft with a window clamped to the current UTC day', async () => {
    let captured: URL | undefined;
    const feed = new OpenSkyFlightRouteFeed({
      baseUrl: 'https://example.com',
      tokenManager: feedWithAuth(),
      now: () => NOW,
      windowHours: 24,
      fetchImpl: async (input) => {
        captured = input instanceof URL ? input : new URL(String(input));
        return new Response(JSON.stringify([flight]), { status: 200 });
      },
    });

    const info = await feed.getDestination(ICAO24);
    expect(info).toEqual(expectedInfo);
    expect(captured?.pathname).toBe('/api/flights/aircraft');
    expect(captured?.searchParams.get('icao24')).toBe(ICAO24);
    expect(captured?.searchParams.get('begin')).toBe(String(START_OF_DAY));
    expect(captured?.searchParams.get('end')).toBe(String(NOW));
  });

  it('sends the Bearer token when credentials are configured', async () => {
    const headers: Record<string, string> = {};
    const feed = new OpenSkyFlightRouteFeed({
      baseUrl: 'https://example.com',
      tokenManager: feedWithAuth(),
      now: () => NOW,
      fetchImpl: async (_input, init) => {
        Object.assign(headers, init?.headers);
        return new Response(JSON.stringify([flight]), { status: 200 });
      },
    });

    await feed.getDestination(ICAO24);
    expect(headers['authorization']).toBe('Bearer tok-x');
  });

  it('uses second-resolution timestamps with the real clock', async () => {
    let captured: URL | undefined;
    const feed = new OpenSkyFlightRouteFeed({
      baseUrl: 'https://example.com',
      fetchImpl: async (input) => {
        captured = input instanceof URL ? input : new URL(String(input));
        return new Response(JSON.stringify([]), { status: 200 });
      },
    });

    await feed.getDestination(ICAO24);
    const begin = Number(captured?.searchParams.get('begin'));
    const end = Number(captured?.searchParams.get('end'));
    expect(begin).toBeGreaterThan(1_000_000_000);
    expect(begin).toBeLessThan(4_000_000_000);
    expect(end).toBeGreaterThan(1_000_000_000);
    expect(end).toBeLessThan(4_000_000_000);
  });

  it('returns null for a 404 (no flights found)', async () => {
    const feed = new OpenSkyFlightRouteFeed({
      baseUrl: 'https://example.com',
      now: () => NOW,
      fetchImpl: async () => new Response('', { status: 404 }),
    });
    expect(await feed.getDestination(ICAO24)).toBeNull();
  });

  it('throws a feed error for other HTTP errors', async () => {
    const feed = new OpenSkyFlightRouteFeed({
      baseUrl: 'https://example.com',
      now: () => NOW,
      fetchImpl: async () => new Response('', { status: 500 }),
    });
    await expect(feed.getDestination(ICAO24)).rejects.toMatchObject({
      code: 'feed_unavailable',
      status: 502,
    });
  });

  it('retries on 429 (honoring retry-after) and succeeds', async () => {
    const waits: number[] = [];
    let calls = 0;
    const feed = new OpenSkyFlightRouteFeed({
      baseUrl: 'https://example.com',
      now: () => NOW,
      attempts: 3,
      fetchImpl: async () => {
        calls += 1;
        if (calls === 1) {
          return new Response('', {
            status: 429,
            headers: { 'X-Rate-Limit-Retry-After-Seconds': '1' },
          });
        }
        return new Response(JSON.stringify([flight]), { status: 200 });
      },
      wait: async (ms) => {
        waits.push(ms);
      },
    });

    expect(await feed.getDestination(ICAO24)).toEqual(expectedInfo);
    expect(calls).toBe(2);
    expect(waits).toEqual([1000]);
  });

  it('maps an empty flights array to null', async () => {
    const feed = new OpenSkyFlightRouteFeed({
      baseUrl: 'https://example.com',
      now: () => NOW,
      fetchImpl: async () => new Response(JSON.stringify([]), { status: 200 }),
    });
    expect(await feed.getDestination(ICAO24)).toBeNull();
  });
});
