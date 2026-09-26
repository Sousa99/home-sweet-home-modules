import { FeedUnavailableError } from './errors';

export interface RetryOptions {
  /** Maximum number of attempts on upstream 429 (default 3). */
  attempts?: number;
  /** Default backoff in milliseconds when no retry-after header is present (default 2000). */
  defaultWaitMs?: number;
  /** Upper bound in milliseconds for a single retry wait (default 10000). */
  capWaitMs?: number;
  /** Called once before a single retry following a 401 (e.g. refresh the auth token). */
  on401?: () => Promise<void>;
  /** fetch implementation override (for tests). */
  fetchImpl?: typeof fetch;
  /** Wait implementation override (for tests; default is a real timer). */
  wait?: (ms: number) => Promise<void>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extract the retry-after wait from a 429 response's
 * `X-Rate-Limit-Retry-After-Seconds` header (seconds, may be fractional),
 * capped at `capMs`. Returns `null` when the header is absent/invalid.
 */
function retryAfterMs(response: Response, capMs: number): number | null {
  const header = response.headers.get('X-Rate-Limit-Retry-After-Seconds');
  if (header === null) return null;
  const seconds = Number(header);
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  return Math.min(seconds * 1000, capMs);
}

/**
 * Fetch with bounded retry semantics for the OpenSky feeds.
 *
 * - **429** (rate limited): waits `X-Rate-Limit-Retry-After-Seconds` (or
 *   `defaultWaitMs` when absent), capped at `capWaitMs`, and retries up to
 *   `attempts` times. When the budget is exhausted it throws a retryable
 *   {@link FeedUnavailableError}.
 * - **401** (token expired): calls `on401` once (e.g. to refresh the auth
 *   token) and retries the request a single time with the refreshed token.
 *
 * Network failures and other statuses are passed through unchanged so each
 * feed maps them with its existing semantics.
 *
 * @param input - the request URL
 * @param init - the request options
 * @param options - retry tuning
 * @returns the final successful response
 * @throws {FeedUnavailableError} when 429 persists across all attempts
 */
export async function fetchWithRetry(
  input: string | URL | Request,
  init: RequestInit,
  options: RetryOptions = {},
): Promise<Response> {
  const attempts = options.attempts ?? 3;
  const defaultWaitMs = options.defaultWaitMs ?? 2000;
  const capWaitMs = options.capWaitMs ?? 10_000;
  const fetchImpl = options.fetchImpl ?? fetch;
  const wait = options.wait ?? sleep;
  const on401 = options.on401;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetchImpl(input, init);

    if (response.status === 429) {
      if (attempt < attempts) {
        await wait(retryAfterMs(response, capWaitMs) ?? defaultWaitMs);
        continue;
      }
      throw new FeedUnavailableError('Aircraft feed is rate limited', { retryable: true });
    }

    if (response.status === 401 && on401 !== undefined) {
      await on401();
      return fetchImpl(input, init);
    }

    return response;
  }

  throw new FeedUnavailableError('Aircraft feed is rate limited', { retryable: true });
}
