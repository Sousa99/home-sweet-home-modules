import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureApiBaseUrl, getApiBaseUrl, loadApiBaseUrl } from '../../api/baseUrl';

describe('baseUrl contract', () => {
  beforeEach(() => {
    configureApiBaseUrl(undefined);
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('defaults to the empty string (same-origin /api)', () => {
    expect(getApiBaseUrl()).toBe('');
  });

  it('stores the configured base URL, trimming whitespace', () => {
    configureApiBaseUrl('  http://localhost:3104  ');
    expect(getApiBaseUrl()).toBe('http://localhost:3104');
  });

  it('loads the base URL from /config.json', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ apiBaseUrl: 'http://localhost:3104' }), { status: 200 }),
    );
    await loadApiBaseUrl();
    expect(getApiBaseUrl()).toBe('http://localhost:3104');
  });

  it('falls back to same-origin /api on a non-OK /config.json', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('not found', { status: 404 }));
    await loadApiBaseUrl();
    expect(getApiBaseUrl()).toBe('');
  });

  it('falls back to same-origin /api when /config.json is unreachable', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network down'));
    await loadApiBaseUrl();
    expect(getApiBaseUrl()).toBe('');
  });
});
