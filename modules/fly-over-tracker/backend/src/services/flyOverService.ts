import type { Aircraft, FlyOverResult, LocationQuery } from '../domain/types';
import { LocationQuerySchema } from '../domain/schemas';
import type { FeedState } from '../feeds/types';
import type { AircraftFeed } from '../feeds/types';
import type { DestinationInfo, FlightRouteFeed } from '../feeds/types';
import { bboxFromCircle, haversineKm } from '../geometry';
import { countryForIcao } from '../lib/airports';
import { loadConfig } from '../lib/config';
import { createDestinationCache, type DestinationCache } from '../lib/destinationCache';
import { FeedUnavailableError, ValidationError, formatZodError } from '../lib/errors';

/**
 * The query capability shared by the REST endpoint and the MCP tool.
 */
export interface FlyOverService {
  /**
   * Answer "which aircraft are currently over a GPS point and radius".
   *
   * @param location - the validated location query
   * @returns the aircraft over the area, sorted by distance ascending
   * @throws {ValidationError} when the input does not satisfy the schema
   * @throws {FeedUnavailableError} when the feed cannot provide data
   */
  query(location: LocationQuery): Promise<FlyOverResult>;
}

export interface FlyOverServiceOptions {
  /** TTL in ms for positive destination lookups. */
  destinationCacheTtlMs?: number;
  /** TTL in ms for negative (not found) destination lookups. */
  destinationNegativeTtlMs?: number;
  /** Maximum number of parallel destination lookups per query. */
  destinationConcurrency?: number;
}

function toAircraft(
  state: FeedState & { latitude: number; longitude: number },
  distanceKm: number,
): Aircraft {
  return {
    icao24: state.icao24,
    callsign: state.callsign,
    originCountry: state.originCountry,
    // Populated by destination enrichment (see query pipeline below).
    destinationAirport: null,
    destinationCountry: null,
    latitude: state.latitude,
    longitude: state.longitude,
    altitude: state.baroAltitude,
    onGround: state.onGround,
    velocity: state.velocity,
    trueTrack: state.trueTrack,
    verticalRate: state.verticalRate,
    distanceKm,
  };
}

/**
 * Map `fn` over `items` with at most `limit` promises in flight at once,
 * preserving input order.
 */
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
      // Index is within bounds by the loop guard above.
      results[index] = await fn(items[index] as T);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Resolve a destination for every matched aircraft via the route feed and
 * cache. Lookups are bounded by `concurrency`; a failed lookup (rate-limited
 * or unavailable) leaves that aircraft's destination unresolved and flags the
 * result as partial.
 */
async function enrichDestinations(
  aircraft: readonly Aircraft[],
  routeFeed: FlightRouteFeed,
  cache: DestinationCache,
  concurrency: number,
): Promise<{ enrichment: 'complete' | 'partial'; destinations: (DestinationInfo | null)[] }> {
  let hadFailure = false;
  const destinations = await mapWithConcurrency(aircraft, concurrency, async (aircraft) => {
    const cached = cache.get(aircraft.icao24);
    if (cached !== undefined) return cached;
    try {
      const info = await routeFeed.getDestination(aircraft.icao24);
      cache.set(aircraft.icao24, info);
      return info;
    } catch (err) {
      if (!(err instanceof FeedUnavailableError)) throw err;
      hadFailure = true;
      return null;
    }
  });
  return { enrichment: hadFailure ? 'partial' : 'complete', destinations };
}

/**
 * Create the shared fly-over service bound to a feed.
 *
 * The service re-validates its input against the shared schema (single source
 * of truth) so every caller — REST and MCP — gets identical validation.
 *
 * @param feed - the aircraft feed to query
 * @param routeFeed - optional flight-route feed for destination enrichment;
 *   when absent the result reports `destinationEnrichment: 'unavailable'`
 * @param options - enrichment tuning (defaults from runtime config)
 * @returns a {@link FlyOverService}
 */
export function createFlyOverService(
  feed: AircraftFeed,
  routeFeed?: FlightRouteFeed,
  options: FlyOverServiceOptions = {},
): FlyOverService {
  const cfg = loadConfig();
  const concurrency = options.destinationConcurrency ?? cfg.destinationConcurrency;
  const cache = createDestinationCache({
    ttlMs: options.destinationCacheTtlMs ?? cfg.destinationCacheTtlMs,
    negativeTtlMs: options.destinationNegativeTtlMs ?? cfg.destinationNegativeTtlMs,
  });

  return {
    async query(input: LocationQuery): Promise<FlyOverResult> {
      const parsed = LocationQuerySchema.safeParse(input);
      if (!parsed.success) {
        throw new ValidationError('Invalid location query', formatZodError(parsed.error));
      }

      const { lat, lng, radiusKm } = parsed.data;
      const snapshot = await feed.getSnapshot(bboxFromCircle(lat, lng, radiusKm));

      const aircraft = snapshot.states
        .filter(
          (state): state is FeedState & { latitude: number; longitude: number } =>
            state.latitude !== null && state.longitude !== null,
        )
        .map((state) => ({
          state,
          distanceKm: haversineKm(lat, lng, state.latitude, state.longitude),
        }))
        .filter(({ distanceKm }) => distanceKm <= radiusKm)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .map(({ state, distanceKm }) => toAircraft(state, distanceKm));

      let destinationEnrichment: FlyOverResult['destinationEnrichment'];
      let destinations: (DestinationInfo | null)[] | null = null;

      if (routeFeed === undefined) {
        destinationEnrichment = 'unavailable';
      } else {
        const enriched = await enrichDestinations(aircraft, routeFeed, cache, concurrency);
        destinationEnrichment = enriched.enrichment;
        destinations = enriched.destinations;
      }

      const enrichedAircraft = aircraft.map((aircraft, index) => {
        if (destinations === null) return aircraft;
        const airport = destinations[index]?.estArrivalAirport ?? null;
        return {
          ...aircraft,
          destinationAirport: airport,
          destinationCountry: countryForIcao(airport),
        };
      });

      return {
        center: { lat, lng },
        radiusKm,
        asOf: snapshot.time,
        count: enrichedAircraft.length,
        destinationEnrichment,
        aircraft: enrichedAircraft,
      };
    },
  };
}
