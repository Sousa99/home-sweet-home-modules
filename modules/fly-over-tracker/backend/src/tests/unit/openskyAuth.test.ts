import { describe, expect, it } from 'vitest';
import { OAuth2TokenManager } from '../../feeds/openskyAuth';

const CLIENT_ID = 'cid';
const CLIENT_SECRET = 'csec';
const TOKEN_URL = 'https://auth.example.com/token';

function tokenResponse(token = 'tok-1', expiresIn = 1800): Response {
  return new Response(JSON.stringify({ access_token: token, expires_in: expiresIn }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('OAuth2TokenManager', () => {
  it('has no credentials when id/secret are empty', () => {
    const tm = new OAuth2TokenManager({ clientId: '', clientSecret: '', tokenUrl: TOKEN_URL });
    expect(tm.hasCredentials).toBe(false);
  });

  it('obtains a token with the client-credentials flow and reuses it within its window', async () => {
    let calls = 0;
    const tm = new OAuth2TokenManager({
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      tokenUrl: TOKEN_URL,
      fetchImpl: async (_input, init) => {
        calls += 1;
        const body = init?.body as URLSearchParams;
        expect(body.get('grant_type')).toBe('client_credentials');
        expect(body.get('client_id')).toBe(CLIENT_ID);
        expect(body.get('client_secret')).toBe(CLIENT_SECRET);
        return tokenResponse('tok-A');
      },
    });
    const first = await tm.getToken();
    const second = await tm.getToken();
    expect(first).toBe('tok-A');
    expect(second).toBe('tok-A');
    expect(calls).toBe(1);
  });

  it('refreshes proactively before expiry', async () => {
    let t = 0;
    const tm = new OAuth2TokenManager({
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      tokenUrl: TOKEN_URL,
      now: () => t,
      refreshMarginMs: 60_000,
      fetchImpl: async () => tokenResponse('tok-B'),
    });
    await tm.getToken(); // cached with expiresAt = 0 + 1800_000
    t = 1_800_000 - 30_000; // 30s before expiry, inside the 60s margin
    expect(await tm.getToken()).toBe('tok-B');
  });

  it('refresh() forces a new token (401 path)', async () => {
    let count = 0;
    const tm = new OAuth2TokenManager({
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      tokenUrl: TOKEN_URL,
      fetchImpl: async () => tokenResponse(`tok-${++count}`),
    });
    expect(await tm.getToken()).toBe('tok-1');
    expect(await tm.refresh()).toBe('tok-2');
  });

  it('throws a feed error when the token endpoint returns an error status', async () => {
    const tm = new OAuth2TokenManager({
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      tokenUrl: TOKEN_URL,
      fetchImpl: async () => new Response('nope', { status: 500 }),
    });
    await expect(tm.getToken()).rejects.toMatchObject({ code: 'feed_unavailable', status: 502 });
  });

  it('throws a retryable feed error on network failure', async () => {
    const tm = new OAuth2TokenManager({
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      tokenUrl: TOKEN_URL,
      fetchImpl: async () => {
        throw new Error('network');
      },
    });
    await expect(tm.getToken()).rejects.toMatchObject({ code: 'rate_limited', status: 503 });
  });
});
