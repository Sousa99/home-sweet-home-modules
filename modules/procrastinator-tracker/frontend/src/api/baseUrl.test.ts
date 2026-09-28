import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureApiBaseUrl, getApiBaseUrl, loadApiBaseUrl } from './baseUrl';

describe('baseUrl module state', () => {
  beforeEach(() => {
    configureApiBaseUrl(undefined);
  });

  it('round-trips a configured base URL (trimmed)', () => {
    configureApiBaseUrl('  https://api.example.com  ');
    expect(getApiBaseUrl()).toBe('https://api.example.com');
  });

  it('defaults to the empty string (same-origin)', () => {
    expect(getApiBaseUrl()).toBe('');
  });
});

describe('loadApiBaseUrl', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    configureApiBaseUrl(undefined);
  });

  it('configures the API base URL from /config.json on success', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ apiBaseUrl: 'https://api.example.com' }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await loadApiBaseUrl();

    expect(fetchMock).toHaveBeenCalledWith('/config.json', {
      headers: { Accept: 'application/json' },
    });
    expect(getApiBaseUrl()).toBe('https://api.example.com');
  });

  it('falls back to the same-origin default when the fetch fails', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new Error('network down');
    });

    await expect(loadApiBaseUrl()).resolves.toBeUndefined();
    expect(getApiBaseUrl()).toBe('');
  });

  it('falls back to the same-origin default on an unparseable response', async () => {
    vi.stubGlobal('fetch', async () => new Response('<html>not json</html>', { status: 200 }));

    await expect(loadApiBaseUrl()).resolves.toBeUndefined();
    expect(getApiBaseUrl()).toBe('');
  });
});
