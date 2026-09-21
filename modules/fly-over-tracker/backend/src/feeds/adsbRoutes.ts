import { loadConfig } from '../lib/config';
import { FeedUnavailableError } from '../lib/errors';
import { fetchWithRetry } from '../lib/retry';
import { ADSBLOL_USER_AGENT } from './adsbLol';
import type { DestinationInfo, FlightRouteFeed, RouteAirport, RouteLookup } from './types';

/**
 * Max number of route fetches in flight at once. Route data is served as one
 * static JSON file per callsign, so a query of N aircraft means up to N GETs.
 */
const CONCURRENCY = 8;

/**
 * adsb.lol standing-data route file (`routes/{xx}/{callsign}.json`, subset we
 * consume).
 */
interface RouteEntry {
  callsign: string;
  airport_codes: string;
  /** Airport objects ordered from departure to arrival. */
  _airports: RouteAirport[];
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function routeEntry(value: unknown): RouteEntry | null {
  if (typeof value !== 'object' || value === null) return null;
  const entry = value as Record<string, unknown>;
  const callsign = nullableString(entry['callsign']);
  const airportCodes = nullableString(entry['airport_codes']);
  const airports = Array.isArray(entry['_airports']) ? entry['_airports'] : null;
  if (callsign === null || airportCodes === null || airports === null) return null;
  const parsed: RouteEntry = {
    callsign,
    airport_codes: airportCodes,
    _airports: airports
      .filter((a): a is Record<string, unknown> => typeof a === 'object' && a !== null)
      .map((a) => ({
        icao: String(a['icao'] ?? '').trim(),
        city: nullableString(a['location']),
        name: nullableString(a['name']),
        countryIso2: nullableString(a['countryiso2']),
      }))
      .filter((a) => a.icao !== ''),
  };
  if (parsed._airports.length < 2) return null;
  return parsed;
}

/**
 * Map a raw adsb.lol standing-data route file to a {@link DestinationInfo}.
 * Exported for unit testing.
 *
 * @param data - the parsed JSON response body for one callsign
 * @param icao24 - the aircraft the route is being resolved for
 * @returns the identified origin/destination, or `null` when the route is
 *   unknown
 * @throws {FeedUnavailableError} when the payload is malformed
 */
export function mapAdsbRouteResponse(data: unknown, icao24: string): DestinationInfo | null {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new FeedUnavailableError('Route feed response is malformed');
  }
  const entry = routeEntry(data);
  if (entry === null || entry.airport_codes === 'unknown') return null;
  const departure = entry._airports[0] ?? null;
  const arrival = entry._airports[entry._airports.length - 1] ?? null;
  return {
    icao24,
    estDepartureAirport: departure,
    estArrivalAirport: arrival,
  };
}

/** Map `fn` over `items` with at most `limit` promises in flight at once. */
async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index] as T);
    }
  });
  await Promise.all(workers);
  return results;
}

export interface AdsbRouteFeedOptions {
  /** Base URL of the adsb.lol standing-data route files. */
  baseUrl?: string;
  /** Timeout in milliseconds for a single request. */
  timeoutMs?: number;
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
 * Flight-route feed backed by the adsb.lol standing-data route files
 * (`GET /routes/{xx}/{callsign}.json`), resolving the current route
 * (origin/destination airports) per callsign. A `404` (unknown callsign)
 * maps to `null`. Requires a descriptive User-Agent (adsb.lol rejects generic
 * ones with 403).
 */
export class AdsbRouteFeed implements FlightRouteFeed {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly attempts: number;
  private readonly defaultWaitMs: number;
  private readonly capWaitMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly wait?: (ms: number) => Promise<void>;

  constructor(options: AdsbRouteFeedOptions = {}) {
    const cfg = loadConfig();
    this.baseUrl = options.baseUrl ?? cfg.routeBaseUrl;
    this.timeoutMs = options.timeoutMs ?? cfg.feedTimeoutMs;
    this.attempts = options.attempts ?? cfg.retryAttempts;
    this.defaultWaitMs = options.defaultWaitMs ?? cfg.retryDefaultMs;
    this.capWaitMs = options.capWaitMs ?? cfg.retryCapMs;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.wait = options.wait;
  }

  /**
   * Resolve the current route for a batch of aircraft.
   *
   * @param lookups - the aircraft to resolve (keyed by callsign upstream)
   * @returns a map from `icao24` to its destination info, or `null` for
   *   aircraft whose route is unknown or who have no callsign
   * @throws {FeedUnavailableError} on network failure, rate limit exhaustion,
   *   or an upstream error / malformed payload
   */
  async resolveRoutes(
    lookups: readonly RouteLookup[],
  ): Promise<Map<string, DestinationInfo | null>> {
    const result = new Map<string, DestinationInfo | null>();
    const withCallsign = lookups.filter((lookup) => lookup.callsign !== null);
    for (const lookup of lookups) {
      if (lookup.callsign === null) result.set(lookup.icao24, null);
    }

    const resolved = await mapWithConcurrency(
      withCallsign,
      CONCURRENCY,
      async (lookup): Promise<[string, DestinationInfo | null]> => {
        const info = await this.getRoute(lookup.callsign as string, lookup.icao24);
        return [lookup.icao24, info];
      },
    );
    for (const [icao24, info] of resolved) {
      result.set(icao24, info);
    }
    return result;
  }

  private async getRoute(callsign: string, icao24: string): Promise<DestinationInfo | null> {
    const url = new URL(
      `/routes/${callsign.slice(0, 2).toUpperCase()}/${callsign}.json`,
      this.baseUrl,
    );

    let response: Response;
    try {
      response = await fetchWithRetry(
        url,
        {
          signal: AbortSignal.timeout(this.timeoutMs),
          headers: { 'user-agent': ADSBLOL_USER_AGENT },
        },
        {
          attempts: this.attempts,
          defaultWaitMs: this.defaultWaitMs,
          capWaitMs: this.capWaitMs,
          fetchImpl: this.fetchImpl,
          wait: this.wait,
        },
      );
    } catch (err) {
      if (err instanceof FeedUnavailableError) throw err;
      throw new FeedUnavailableError('Route feed request failed', {
        retryable: true,
        cause: err,
      });
    }

    // A 404 means the callsign has no standing route (e.g. general aviation).
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new FeedUnavailableError(`Route feed returned HTTP ${response.status}`, {
        retryable: response.status === 429,
      });
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch (err) {
      throw new FeedUnavailableError('Route feed returned an unreadable payload', { cause: err });
    }

    return mapAdsbRouteResponse(data, icao24);
  }
}
