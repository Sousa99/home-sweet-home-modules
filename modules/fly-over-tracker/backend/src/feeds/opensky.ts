import type { BoundingBox } from '../geometry';
import { loadConfig } from '../lib/config';
import { FeedUnavailableError } from '../lib/errors';
import { fetchWithRetry } from '../lib/retry';
import type { AircraftFeed, FeedSnapshot, FeedState } from './types';
import type { OAuth2TokenManager } from './openskyAuth';

/** Index positions of the fields we consume in an OpenSky state vector. */
const STATE_INDEX = {
  icao24: 0,
  callsign: 1,
  originCountry: 2,
  longitude: 5,
  latitude: 6,
  baroAltitude: 7,
  onGround: 8,
  velocity: 9,
  trueTrack: 10,
  verticalRate: 11,
} as const;

interface OpenSkyResponse {
  time: number;
  /** Aircraft state vectors, or `null` when the area has no aircraft. */
  states: unknown[][] | null;
}

function isOpenSkyResponse(value: unknown): value is OpenSkyResponse {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate['time'] !== 'number') return false;
  if (candidate['states'] === null) return true;
  return (
    Array.isArray(candidate['states']) && candidate['states'].every((row) => Array.isArray(row))
  );
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Map a raw OpenSky `/states/all` payload into a {@link FeedSnapshot}.
 * Exported for unit testing.
 *
 * `states: null` (OpenSky's response for an area with no aircraft) maps to an
 * empty snapshot — a valid "no aircraft" result, not an error.
 *
 * @param data - the parsed JSON response body
 * @returns a normalized snapshot
 * @throws {FeedUnavailableError} when the payload is malformed
 */
export function mapOpenSkyResponse(data: unknown): FeedSnapshot {
  if (!isOpenSkyResponse(data)) {
    throw new FeedUnavailableError('Aircraft feed returned a malformed payload');
  }
  const states = (data.states ?? []).map((row): FeedState => ({
    icao24: String(row[STATE_INDEX.icao24] ?? ''),
    callsign: nullableString(row[STATE_INDEX.callsign]),
    originCountry: nullableString(row[STATE_INDEX.originCountry]),
    latitude: nullableNumber(row[STATE_INDEX.latitude]),
    longitude: nullableNumber(row[STATE_INDEX.longitude]),
    baroAltitude: nullableNumber(row[STATE_INDEX.baroAltitude]),
    onGround: Boolean(row[STATE_INDEX.onGround]),
    velocity: nullableNumber(row[STATE_INDEX.velocity]),
    trueTrack: nullableNumber(row[STATE_INDEX.trueTrack]),
    verticalRate: nullableNumber(row[STATE_INDEX.verticalRate]),
  }));
  return { time: data.time, states };
}

export interface OpenSkyFeedOptions {
  /** Base URL of the OpenSky REST API. */
  baseUrl?: string;
  /** Timeout in milliseconds for a single feed request. */
  timeoutMs?: number;
  /** OAuth2 token manager; when absent or without credentials the feed runs anonymously. */
  tokenManager?: OAuth2TokenManager;
  /** Bounded retry attempts on upstream 429. */
  attempts?: number;
  /** Default backoff in ms when no retry-after header is present. */
  defaultWaitMs?: number;
  /** Upper bound in ms for a single retry wait. */
  capWaitMs?: number;
  /** fetch implementation override (for tests). */
  fetchImpl?: typeof fetch;
  /** Wait implementation override (for tests). */
  wait?: (ms: number) => Promise<void>;
}

/**
 * Live aircraft feed backed by the OpenSky Network REST API
 * (`GET /api/states/all`). Bounded 429 retries honor the retry-after header;
 * a 401 triggers a single token refresh and retry when credentials are
 * configured.
 */
export class OpenSkyFeed implements AircraftFeed {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly tokenManager?: OAuth2TokenManager;
  private readonly attempts: number;
  private readonly defaultWaitMs: number;
  private readonly capWaitMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly wait?: (ms: number) => Promise<void>;

  constructor(options: OpenSkyFeedOptions = {}) {
    const cfg = loadConfig();
    this.baseUrl = options.baseUrl ?? cfg.feedBaseUrl;
    this.timeoutMs = options.timeoutMs ?? cfg.feedTimeoutMs;
    this.tokenManager = options.tokenManager;
    this.attempts = options.attempts ?? cfg.retryAttempts;
    this.defaultWaitMs = options.defaultWaitMs ?? cfg.retryDefaultMs;
    this.capWaitMs = options.capWaitMs ?? cfg.retryCapMs;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.wait = options.wait;
  }

  /**
   * Query OpenSky for the states inside a bounding box.
   *
   * @param bbox - the bounding box to query
   * @returns the normalized snapshot
   * @throws {FeedUnavailableError} on network failure, timeout, persistent
   *   rate limit (503), or an upstream error / malformed payload (502)
   */
  async getSnapshot(bbox: BoundingBox): Promise<FeedSnapshot> {
    const url = new URL('/api/states/all', this.baseUrl);
    url.searchParams.set('lamin', String(bbox.latMin));
    url.searchParams.set('lomin', String(bbox.lngMin));
    url.searchParams.set('lamax', String(bbox.latMax));
    url.searchParams.set('lomax', String(bbox.lngMax));
    url.searchParams.set('extended', '1');

    const headers: Record<string, string> = {};
    if (this.tokenManager?.hasCredentials) {
      headers['authorization'] = `Bearer ${await this.tokenManager.getToken()}`;
    }

    let response: Response;
    try {
      response = await fetchWithRetry(
        url,
        { signal: AbortSignal.timeout(this.timeoutMs), headers },
        {
          attempts: this.attempts,
          defaultWaitMs: this.defaultWaitMs,
          capWaitMs: this.capWaitMs,
          fetchImpl: this.fetchImpl,
          wait: this.wait,
          on401: this.tokenManager
            ? async () => {
                await this.tokenManager!.refresh();
              }
            : undefined,
        },
      );
    } catch (err) {
      if (err instanceof FeedUnavailableError) throw err;
      throw new FeedUnavailableError('Aircraft feed request failed', {
        retryable: true,
        cause: err,
      });
    }

    if (!response.ok) {
      throw new FeedUnavailableError(`Aircraft feed returned HTTP ${response.status}`, {
        retryable: response.status === 429,
      });
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch (err) {
      throw new FeedUnavailableError('Aircraft feed returned an unreadable payload', {
        cause: err,
      });
    }

    return mapOpenSkyResponse(data);
  }
}
