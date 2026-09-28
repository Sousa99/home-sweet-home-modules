import { afterEach, describe, expect, it, vi } from 'vitest';
import { configureApiBaseUrl, getApiBaseUrl, loadApiBaseUrl } from './baseUrl';

afterEach(() => {
  configureApiBaseUrl(undefined);
  vi.unstubAllGlobals();
});

describe('configureApiBaseUrl / getApiBaseUrl', () => {
  it('defaults to the same-origin empty string', () => {
    expect(getApiBaseUrl()).toBe('');
  });

  it('round-trips a configured URL', () => {
    configureApiBaseUrl('http://localhost:3100');
    expect(getApiBaseUrl()).toBe('http://localhost:3100');
  });

  it('trims surrounding whitespace and treats undefined as empty', () => {
    configureApiBaseUrl('  http://localhost:3100  ');
    expect(getApiBaseUrl()).toBe('http://localhost:3100');

    configureApiBaseUrl(undefined);
    expect(getApiBaseUrl()).toBe('');

    configureApiBaseUrl('');
    expect(getApiBaseUrl()).toBe('');
  });
});

describe('loadApiBaseUrl', () => {
  it('fetches /config.json with an Accept header and configures apiBaseUrl', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ apiBaseUrl: 'http://localhost:3100' }),
      }),
    );

    await loadApiBaseUrl();

    expect(getApiBaseUrl()).toBe('http://localhost:3100');
    expect(fetch).toHaveBeenCalledWith('/config.json', {
      headers: { Accept: 'application/json' },
    });
  });

  it('falls back to same-origin (empty) when the request fails', async () => {
    configureApiBaseUrl('http://localhost:3100');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await loadApiBaseUrl();

    expect(getApiBaseUrl()).toBe('');
  });

  it('falls back to same-origin (empty) when the payload is not valid JSON', async () => {
    configureApiBaseUrl('http://localhost:3100');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new SyntaxError('Unexpected token < in JSON');
        },
      }),
    );

    await loadApiBaseUrl();

    expect(getApiBaseUrl()).toBe('');
  });

  it('never throws, even when /config.json is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')));

    await expect(loadApiBaseUrl()).resolves.toBeUndefined();
  });
});
