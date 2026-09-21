import { describe, expect, it } from 'vitest';
import { bboxFromCircle } from '../../geometry';
import { FeedUnavailableError } from '../../lib/errors';
import { MockFeed } from '../../feeds/mock';
import { mapOpenSkyResponse, OpenSkyFeed } from '../../feeds/opensky';
import { OAuth2TokenManager } from '../../feeds/openskyAuth';

const rawState = [
  '3c6444', // 0 icao24
  'DLH400 ', // 1 callsign (trailing space)
  'Germany', // 2 origin_country
  1_726_900_000, // 3 time_position
  1_726_900_010, // 4 last_contact
  2.4288, // 5 longitude
  48.9211, // 6 latitude
  9144.0, // 7 baro_altitude
  false, // 8 on_ground
  251.2, // 9 velocity
  87.5, // 10 true_track
  0.0, // 11 vertical_rate
  null, // 12 sensors
  9448.8, // 13 geo_altitude
  '1000', // 14 squawk
  false, // 15 spi
  0, // 16 position_source
  3, // 17 category (extended)
] as unknown[];

describe('mapOpenSkyResponse', () => {
  it('maps a state vector by index and trims the callsign', () => {
    const snapshot = mapOpenSkyResponse({ time: 1_726_900_000, states: [rawState] });
    expect(snapshot.time).toBe(1_726_900_000);
    const [state] = snapshot.states;
    expect(state).toMatchObject({
      icao24: '3c6444',
      callsign: 'DLH400',
      originCountry: 'Germany',
      longitude: 2.4288,
      latitude: 48.9211,
      baroAltitude: 9144.0,
      onGround: false,
      velocity: 251.2,
      trueTrack: 87.5,
      verticalRate: 0.0,
    });
  });

  it('maps null positions and empty callsigns to null', () => {
    const snapshot = mapOpenSkyResponse({
      time: 1,
      states: [
        [
          'abc123',
          '   ',
          'France',
          null,
          null,
          null,
          null,
          null,
          true,
          null,
          null,
          null,
          null,
          null,
          null,
          false,
          0,
          0,
        ],
      ],
    });
    expect(snapshot.states[0]).toMatchObject({
      icao24: 'abc123',
      callsign: null,
      originCountry: 'France',
      latitude: null,
      longitude: null,
      baroAltitude: null,
      onGround: true,
      velocity: null,
    });
  });

  it('treats a null states payload as an empty snapshot (no aircraft in area)', () => {
    const snapshot = mapOpenSkyResponse({ time: 1_726_900_000, states: null });
    expect(snapshot).toEqual({ time: 1_726_900_000, states: [] });
  });

  it('rejects malformed payloads', () => {
    expect(() => mapOpenSkyResponse({ time: 1, states: 'nope' })).toThrow(FeedUnavailableError);
    expect(() => mapOpenSkyResponse({})).toThrow(FeedUnavailableError);
  });
});

describe('OpenSkyFeed', () => {
  const bbox = bboxFromCircle(48.8566, 2.3522, 50);
  const noWait = async () => {};

  function tokenManager() {
    return new OAuth2TokenManager({
      clientId: 'cid',
      clientSecret: 'csec',
      tokenUrl: 'https://auth.example.com/token',
      fetchImpl: async () =>
        new Response(JSON.stringify({ access_token: 'tok-x', expires_in: 1800 }), { status: 200 }),
    });
  }

  it('queries the bounding box with extended=1 and maps the response', async () => {
    let capturedUrl: URL | undefined;
    const feed = new OpenSkyFeed({
      baseUrl: 'https://example.com',
      fetchImpl: async (input) => {
        capturedUrl = input instanceof URL ? input : new URL(String(input));
        return new Response(JSON.stringify({ time: 1_726_900_000, states: [rawState] }), {
          status: 200,
        });
      },
    });
    const snapshot = await feed.getSnapshot(bbox);
    expect(capturedUrl?.pathname).toBe('/api/states/all');
    expect(capturedUrl?.searchParams.get('lamin')).toBe(String(bbox.latMin));
    expect(capturedUrl?.searchParams.get('lomin')).toBe(String(bbox.lngMin));
    expect(capturedUrl?.searchParams.get('lamax')).toBe(String(bbox.latMax));
    expect(capturedUrl?.searchParams.get('lomax')).toBe(String(bbox.lngMax));
    expect(capturedUrl?.searchParams.get('extended')).toBe('1');
    expect(snapshot.states).toHaveLength(1);
  });

  it('sends the Bearer token when credentials are configured', async () => {
    const headers: Record<string, string> = {};
    const feed = new OpenSkyFeed({
      baseUrl: 'https://example.com',
      tokenManager: tokenManager(),
      fetchImpl: async (_input, init) => {
        Object.assign(headers, init?.headers);
        return new Response(JSON.stringify({ time: 1, states: [rawState] }), { status: 200 });
      },
    });
    await feed.getSnapshot(bbox);
    expect(headers['authorization']).toBe('Bearer tok-x');
  });

  it('retries on 429 honoring the retry-after header, then succeeds', async () => {
    const waits: number[] = [];
    let calls = 0;
    const feed = new OpenSkyFeed({
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
        return new Response(JSON.stringify({ time: 1, states: [rawState] }), { status: 200 });
      },
    });
    const snapshot = await feed.getSnapshot(bbox);
    expect(snapshot.states).toHaveLength(1);
    expect(calls).toBe(2);
    expect(waits).toEqual([2000]);
  });

  it('throws a rate-limited error after bounded 429 attempts', async () => {
    let calls = 0;
    const feed = new OpenSkyFeed({
      baseUrl: 'https://example.com',
      attempts: 2,
      wait: noWait,
      fetchImpl: async () => {
        calls += 1;
        return new Response('{}', { status: 429 });
      },
    });
    await expect(feed.getSnapshot(bbox)).rejects.toMatchObject({
      code: 'rate_limited',
      status: 503,
    });
    expect(calls).toBe(2);
  });

  it('refreshes the token on 401 and retries once', async () => {
    let calls = 0;
    const headers: Record<string, string> = {};
    const feed = new OpenSkyFeed({
      baseUrl: 'https://example.com',
      tokenManager: tokenManager(),
      fetchImpl: async (_input, init) => {
        calls += 1;
        Object.assign(headers, init?.headers);
        if (calls === 1) return new Response('{}', { status: 401 });
        return new Response(JSON.stringify({ time: 1, states: [rawState] }), { status: 200 });
      },
    });
    const snapshot = await feed.getSnapshot(bbox);
    expect(snapshot.states).toHaveLength(1);
    expect(calls).toBe(2);
    expect(headers['authorization']).toBe('Bearer tok-x');
  });

  it('maps other HTTP errors to a feed error (502)', async () => {
    const feed = new OpenSkyFeed({
      fetchImpl: async () => new Response('{}', { status: 500 }),
    });
    await expect(feed.getSnapshot(bbox)).rejects.toMatchObject({
      code: 'feed_unavailable',
      status: 502,
    });
  });

  it('maps network failures to a retryable feed error (503)', async () => {
    const feed = new OpenSkyFeed({
      fetchImpl: async () => {
        throw new Error('network down');
      },
    });
    await expect(feed.getSnapshot(bbox)).rejects.toMatchObject({
      code: 'rate_limited',
      status: 503,
    });
  });

  it('maps an unreadable payload to a feed error (502)', async () => {
    const feed = new OpenSkyFeed({
      fetchImpl: async () => new Response('<html>not json</html>', { status: 200 }),
    });
    await expect(feed.getSnapshot(bbox)).rejects.toMatchObject({
      code: 'feed_unavailable',
      status: 502,
    });
  });
});

describe('MockFeed', () => {
  it('returns only states inside the bounding box', async () => {
    const feed = new MockFeed();
    const snapshot = await feed.getSnapshot(bboxFromCircle(48.8566, 2.3522, 50));
    const callsigns = snapshot.states.map((s) => s.callsign);
    expect(callsigns).toEqual(['DLH400', 'AFR123', 'BAW456']);
  });

  it('returns no states for a tiny bounding box', async () => {
    const feed = new MockFeed();
    const snapshot = await feed.getSnapshot(bboxFromCircle(48.8566, 2.3522, 1));
    expect(snapshot.states).toHaveLength(0);
  });

  it('keeps a deterministic time', async () => {
    const feed = new MockFeed();
    const snapshot = await feed.getSnapshot(bboxFromCircle(48.8566, 2.3522, 50));
    expect(snapshot.time).toBe(1_726_900_000);
  });
});
