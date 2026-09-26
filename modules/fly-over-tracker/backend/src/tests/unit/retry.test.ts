import { describe, expect, it } from 'vitest';
import { fetchWithRetry } from '../../lib/retry';
import { FeedUnavailableError } from '../../lib/errors';

const ok = () => new Response('{}', { status: 200 });

describe('fetchWithRetry', () => {
  it('returns the response on success without retrying', async () => {
    let calls = 0;
    const response = await fetchWithRetry(
      'https://example.com',
      {},
      {
        fetchImpl: async () => {
          calls += 1;
          return ok();
        },
        wait: async () => {},
      },
    );
    expect(response.status).toBe(200);
    expect(calls).toBe(1);
  });

  it('waits and retries on 429 honoring the retry-after header, then succeeds', async () => {
    const waits: number[] = [];
    let calls = 0;
    const response = await fetchWithRetry(
      'https://example.com',
      {},
      {
        attempts: 3,
        fetchImpl: async () => {
          calls += 1;
          if (calls === 1) {
            return new Response('{}', {
              status: 429,
              headers: { 'X-Rate-Limit-Retry-After-Seconds': '2' },
            });
          }
          return ok();
        },
        wait: async (ms) => {
          waits.push(ms);
        },
      },
    );
    expect(response.status).toBe(200);
    expect(calls).toBe(2);
    expect(waits).toEqual([2000]);
  });

  it('uses the default backoff when no retry-after header is present', async () => {
    const waits: number[] = [];
    let calls = 0;
    await fetchWithRetry(
      'https://example.com',
      {},
      {
        attempts: 2,
        defaultWaitMs: 500,
        fetchImpl: async () => {
          calls += 1;
          return new Response('{}', { status: 429 });
        },
        wait: async (ms) => {
          waits.push(ms);
        },
      },
    ).catch(() => {});
    expect(waits).toEqual([500]);
    expect(calls).toBe(2);
  });

  it('caps the retry-after wait at capWaitMs', async () => {
    const waits: number[] = [];
    await fetchWithRetry(
      'https://example.com',
      {},
      {
        attempts: 2,
        capWaitMs: 1000,
        fetchImpl: async () =>
          new Response('{}', {
            status: 429,
            headers: { 'X-Rate-Limit-Retry-After-Seconds': '60' },
          }),
        wait: async (ms) => {
          waits.push(ms);
        },
      },
    ).catch(() => {});
    expect(waits).toEqual([1000]);
  });

  it('throws a retryable error when 429 persists across all attempts', async () => {
    let calls = 0;
    const err = await fetchWithRetry(
      'https://example.com',
      {},
      {
        attempts: 3,
        fetchImpl: async () => {
          calls += 1;
          return new Response('{}', { status: 429 });
        },
        wait: async () => {},
      },
    ).catch((e) => e);
    expect(err).toBeInstanceOf(FeedUnavailableError);
    expect(err).toMatchObject({ code: 'rate_limited', status: 503 });
    expect(calls).toBe(3);
  });

  it('calls on401 once and retries once with the refreshed token', async () => {
    let calls = 0;
    let refreshed = 0;
    const response = await fetchWithRetry(
      'https://example.com',
      {},
      {
        fetchImpl: async () => {
          calls += 1;
          return calls === 1 ? new Response('{}', { status: 401 }) : ok();
        },
        on401: async () => {
          refreshed += 1;
        },
      },
    );
    expect(response.status).toBe(200);
    expect(calls).toBe(2);
    expect(refreshed).toBe(1);
  });
});
