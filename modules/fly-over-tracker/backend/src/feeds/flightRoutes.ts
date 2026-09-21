import { loadConfig } from '../lib/config';
import { FeedUnavailableError } from '../lib/errors';
import { fetchWithRetry } from '../lib/retry';
import type { DestinationInfo, FlightRouteFeed } from './types';
import type { OAuth2TokenManager } from './openskyAuth';

/**
 * OpenSky `/flights/aircraft` response record (subset we consume).
 */
interface FlightRecord {
  icao24: string;
  firstSeen: number;
  lastSeen: number;
  estDepartureAirport: string | null;
  estArrivalAirport: string | null;
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

/**
 * Unix seconds of the UTC midnight at or before `ts`.
 *
 * The OpenSky `/flights/*` credit cost is tiered by the number of UTC
 * calendar-day partitions the queried time range crosses. Clamping the start
 * of a lookup window to the current UTC day keeps every lookup in the 4-credit
 * "live / < 24h" band instead of jumping to 30 credits when it crosses a
 * midnight boundary.
 */
export function startOfUtcDay(ts: number): number {
  return Math.floor(ts / 86_400) * 86_400;
}

/**
 * Map a raw `/flights/aircraft` payload to a {@link DestinationInfo} for the
 * requested aircraft. Exported for unit testing.
 *
 * @param data - the parsed JSON response body
 * @param icao24 - the aircraft being looked up
 * @param now - reference "now" in Unix seconds
 * @returns the identified destination info, or `null` when no flight is found
 * @throws {FeedUnavailableError} when the payload is malformed
 */
export function mapFlightRouteResponse(
  data: unknown,
  icao24: string,
  now: number,
): DestinationInfo | null {
  if (!Array.isArray(data)) {
    throw new FeedUnavailableError('Flight route response is malformed');
  }

  const records = data
    .filter(
      (entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null,
    )
    .map((entry): FlightRecord => ({
      icao24: String(entry['icao24'] ?? ''),
      firstSeen: Number(entry['firstSeen']),
      lastSeen: Number(entry['lastSeen']),
      estDepartureAirport: nullableString(entry['estDepartureAirport']),
      estArrivalAirport: nullableString(entry['estArrivalAirport']),
    }))
    .filter((record) => record.icao24.toLowerCase() === icao24.toLowerCase())
    .filter((record) => Number.isFinite(record.firstSeen) && Number.isFinite(record.lastSeen));

  if (records.length === 0) return null;

  const covering = records.filter((record) => record.firstSeen <= now && now <= record.lastSeen);
  const pool = covering.length > 0 ? covering : records;
  const chosen = pool.reduce((best, record) => (record.lastSeen > best.lastSeen ? record : best));

  return {
    icao24: chosen.icao24,
    estDepartureAirport: chosen.estDepartureAirport,
    estArrivalAirport: chosen.estArrivalAirport,
  };
}

export interface OpenSkyFlightRouteFeedOptions {
  /** Base URL of the OpenSky REST API. */
  baseUrl?: string;
  /** OAuth2 token manager; when absent or without credentials the feed runs anonymously. */
  tokenManager?: OAuth2TokenManager;
  /** Timeout in milliseconds for a single request. */
  timeoutMs?: number;
  /** Destination lookup window in hours (clamped to the current UTC day). */
  windowHours?: number;
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
  /** Clock for "now" (for tests; default `Date.now`). */
  now?: () => number;
}

/**
 * Flight-route feed backed by the OpenSky `/flights/aircraft` endpoint,
 * resolving an aircraft's estimated destination from its current flight.
 */
export class OpenSkyFlightRouteFeed implements FlightRouteFeed {
  private readonly baseUrl: string;
  private readonly tokenManager?: OAuth2TokenManager;
  private readonly timeoutMs: number;
  private readonly windowHours: number;
  private readonly attempts: number;
  private readonly defaultWaitMs: number;
  private readonly capWaitMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly wait?: (ms: number) => Promise<void>;
  private readonly now: () => number;

  constructor(options: OpenSkyFlightRouteFeedOptions = {}) {
    const cfg = loadConfig();
    this.baseUrl = options.baseUrl ?? cfg.feedBaseUrl;
    this.tokenManager = options.tokenManager;
    this.timeoutMs = options.timeoutMs ?? cfg.feedTimeoutMs;
    this.windowHours = options.windowHours ?? cfg.destinationWindowHours;
    this.attempts = options.attempts ?? cfg.retryAttempts;
    this.defaultWaitMs = options.defaultWaitMs ?? cfg.retryDefaultMs;
    this.capWaitMs = options.capWaitMs ?? cfg.retryCapMs;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.wait = options.wait;
    // OpenSky timestamps are Unix seconds; Date.now() returns milliseconds.
    this.now = options.now ?? (() => Math.floor(Date.now() / 1000));
  }

  /**
   * Resolve the estimated destination for an aircraft.
   *
   * @param icao24 - the aircraft's ICAO 24-bit transponder address (hex)
   * @returns the identified destination info, or `null` when no flight is found
   * @throws {FeedUnavailableError} on network failure, rate limit exhaustion,
   *   or an upstream error / malformed payload
   */
  async getDestination(icao24: string): Promise<DestinationInfo | null> {
    const now = this.now();
    const begin = Math.max(now - this.windowHours * 3600, startOfUtcDay(now));

    const url = new URL('/api/flights/aircraft', this.baseUrl);
    url.searchParams.set('icao24', icao24);
    url.searchParams.set('begin', String(begin));
    url.searchParams.set('end', String(now));

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
      throw new FeedUnavailableError('Flight route request failed', {
        retryable: true,
        cause: err,
      });
    }

    if (response.status === 404) return null;
    if (!response.ok) {
      throw new FeedUnavailableError(`Flight route request returned HTTP ${response.status}`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch (err) {
      throw new FeedUnavailableError('Flight route response is unreadable', { cause: err });
    }

    return mapFlightRouteResponse(data, icao24, now);
  }
}
