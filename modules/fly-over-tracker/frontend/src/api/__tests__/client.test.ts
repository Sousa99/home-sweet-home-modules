import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, getFlyOvers } from '../client';
import type { FlyOverResult } from '../types';

const result: FlyOverResult = {
  center: { lat: 48.8566, lng: 2.3522 },
  radiusKm: 50,
  asOf: 1_726_900_000,
  count: 1,
  destinationEnrichment: 'complete',
  aircraft: [
    {
      icao24: '3c6444',
      callsign: 'DLH400',
      originAirport: null,
      originCity: null,
      originAirportName: null,
      originCountry: 'Germany',
      destinationAirport: null,
      destinationCity: null,
      destinationAirportName: null,
      destinationCountry: null,
      latitude: 48.9211,
      longitude: 2.4288,
      altitude: 9144,
      onGround: false,
      velocity: 251.2,
      trueTrack: 87.5,
      verticalRate: 0,
      distanceKm: 8.2,
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getFlyOvers', () => {
  it('queries the fly-overs endpoint with the right query string', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(result), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await getFlyOvers({ lat: 48.8566, lng: 2.3522, radiusKm: 50 });

    expect(fetchMock).toHaveBeenCalledWith('/api/fly-overs?lat=48.8566&lng=2.3522&radiusKm=50');
  });

  it('prepends a base URL when provided', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(result), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await getFlyOvers({ lat: 48.8566, lng: 2.3522, radiusKm: 50 }, 'https://api.example.com');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/fly-overs?lat=48.8566&lng=2.3522&radiusKm=50',
    );
  });

  it('returns the parsed result on success', async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify(result), { status: 200 }));
    await expect(getFlyOvers({ lat: 1, lng: 2, radiusKm: 3 })).resolves.toEqual(result);
  });

  it('throws an ApiError with per-field errors on 400', async () => {
    vi.stubGlobal(
      'fetch',
      async () =>
        new Response(
          JSON.stringify({
            success: false,
            message: 'Invalid request',
            errors: [{ field: 'lat', message: 'lat must be between -90 and 90' }],
          }),
          { status: 400 },
        ),
    );

    await expect(getFlyOvers({ lat: 999, lng: 2, radiusKm: 3 })).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: 'Invalid request',
      errors: [{ field: 'lat', message: 'lat must be between -90 and 90' }],
    });
  });

  it('throws an ApiError on server errors', async () => {
    vi.stubGlobal(
      'fetch',
      async () =>
        new Response(
          JSON.stringify({ success: false, message: 'Aircraft feed is temporarily unavailable' }),
          {
            status: 503,
          },
        ),
    );

    await expect(getFlyOvers({ lat: 1, lng: 2, radiusKm: 3 })).rejects.toBeInstanceOf(ApiError);
  });
});
