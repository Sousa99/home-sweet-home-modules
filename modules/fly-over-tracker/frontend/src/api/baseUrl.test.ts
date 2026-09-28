import { afterEach, describe, expect, it, vi } from 'vitest';
import { configureApiBaseUrl, getApiBaseUrl, loadApiBaseUrl } from './baseUrl';

afterEach(() => {
  vi.unstubAllGlobals();
  configureApiBaseUrl(undefined);
});

describe('base URL configuration', () => {
  it('defaults to an empty base URL', () => {
    expect(getApiBaseUrl()).toBe('');
  });

  it('stores the configured base URL', () => {
    configureApiBaseUrl('https://api.example.com');
    expect(getApiBaseUrl()).toBe('https://api.example.com');
  });

  it('trims surrounding whitespace', () => {
    configureApiBaseUrl('  https://api.example.com  ');
    expect(getApiBaseUrl()).toBe('https://api.example.com');
  });

  it('resets to the empty default when configured with undefined', () => {
    configureApiBaseUrl('https://api.example.com');
    configureApiBaseUrl(undefined);
    expect(getApiBaseUrl()).toBe('');
  });
});

describe('loadApiBaseUrl', () => {
  it('fetches /config.json with an Accept header and applies apiBaseUrl', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ apiBaseUrl: 'https://api.example.com' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await loadApiBaseUrl();

    expect(fetchMock).toHaveBeenCalledWith('/config.json', {
      headers: { Accept: 'application/json' },
    });
    expect(getApiBaseUrl()).toBe('https://api.example.com');
  });

  it('clears a previously configured value when the request fails', async () => {
    configureApiBaseUrl('https://stale.example.com');
    vi.stubGlobal('fetch', async () => {
      throw new Error('network down');
    });

    await expect(loadApiBaseUrl()).resolves.toBeUndefined();
    expect(getApiBaseUrl()).toBe('');
  });

  it('falls back to the same-origin default on a non-OK response', async () => {
    vi.stubGlobal('fetch', async () => new Response('not found', { status: 404 }));

    await loadApiBaseUrl();

    expect(getApiBaseUrl()).toBe('');
  });

  it('falls back to the same-origin default on invalid JSON', async () => {
    vi.stubGlobal('fetch', async () => new Response('not json', { status: 200 }));

    await loadApiBaseUrl();

    expect(getApiBaseUrl()).toBe('');
  });
});
