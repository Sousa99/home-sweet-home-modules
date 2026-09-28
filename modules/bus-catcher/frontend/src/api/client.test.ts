import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './client';
import { configureApiBaseUrl } from './baseUrl';

function mockFetchJson<T>(body: T) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => body,
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  configureApiBaseUrl(undefined);
  vi.unstubAllGlobals();
});

describe('api client base URL resolution', () => {
  it('targets same-origin /api when no baseUrl is configured or passed', async () => {
    const fetchMock = mockFetchJson({ stops: [] });

    await api.searchStops('sal');

    expect(fetchMock).toHaveBeenCalledWith('/api/stops?q=sal&limit=20', expect.any(Object));
  });

  it('uses a passed baseUrl to build the request URL', async () => {
    const fetchMock = mockFetchJson({ stops: [] });

    await api.searchStops('sal', 20, 'http://localhost:3100');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3100/api/stops?q=sal&limit=20',
      expect.any(Object),
    );
  });

  it('uses the configured baseUrl when no per-call baseUrl is passed', async () => {
    configureApiBaseUrl('http://localhost:3100');
    const fetchMock = mockFetchJson({ lines: [] });

    await api.listLines();

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3100/api/lines', expect.any(Object));
  });

  it('builds query strings and forwards baseUrl on getStopTimes', async () => {
    const fetchMock = mockFetchJson({
      stopId: 'S1',
      times: [],
      realtime: { available: false, lastUpdate: null, liveCount: 0, totalCount: 0 },
    });

    await api.getStopTimes('S1', 3, ['736'], 'http://localhost:3100');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3100/api/stops/S1/times?limit=3&line=736',
      expect.any(Object),
    );
  });

  it('preserves request options (POST) when a baseUrl is provided', async () => {
    const fetchMock = mockFetchJson({ status: 'started' });

    await api.refreshSchedule('http://localhost:3100');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3100/api/refresh',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
