import type { Aircraft, FlyOverResult, LocationQuery } from '../domain/types';
import { LocationQuerySchema } from '../domain/schemas';
import type { FeedState } from '../feeds/types';
import type { AircraftFeed } from '../feeds/types';
import type { DestinationInfo, FlightRouteFeed, RouteLookup } from '../feeds/types';
import { haversineKm } from '../geometry';
import { countryForIcao } from '../lib/airports';
import { loadConfig } from '../lib/config';
import { countryForIso2 } from '../lib/countries';
import { createDestinationCache, type DestinationCache } from '../lib/destinationCache';
import { createSnapshotCache } from '../lib/snapshotCache';
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
  /** TTL in ms for cached feed snapshots keyed by location. */
  snapshotCacheTtlMs?: number;
}

function toAircraft(
  state: FeedState & { latitude: number; longitude: number },
  distanceKm: number,
): Aircraft {
  return {
    icao24: state.icao24,
    callsign: state.callsign,
    // Origin/destination are populated by route enrichment (see query pipeline
    // below); the position feed contributes none.
    originAirport: null,
    originCity: null,
    originAirportName: null,
    originCountry: null,
    destinationAirport: null,
    destinationCity: null,
    destinationAirportName: null,
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
 * Resolve routes for every matched aircraft via the route feed and cache.
 * Only aircraft with no cached route are sent to the feed (one batched
 * request); a failed lookup (rate-limited or unavailable) leaves those
 * aircraft's routes unresolved and flags the result as partial.
 */
async function enrichRoutes(
  aircraft: readonly Aircraft[],
  routeFeed: FlightRouteFeed,
  cache: DestinationCache,
): Promise<{
  enrichment: 'complete' | 'partial';
  destinations: Map<string, DestinationInfo | null>;
}> {
  const lookups: RouteLookup[] = aircraft
    .filter((aircraft) => cache.get(aircraft.icao24) === undefined)
    .map((aircraft) => ({
      icao24: aircraft.icao24,
      callsign: aircraft.callsign,
      latitude: aircraft.latitude,
      longitude: aircraft.longitude,
    }));

  let hadFailure = false;
  if (lookups.length > 0) {
    try {
      const fresh = await routeFeed.resolveRoutes(lookups);
      for (const [icao24, info] of fresh) {
        cache.set(icao24, info);
      }
    } catch (err) {
      if (!(err instanceof FeedUnavailableError)) throw err;
      hadFailure = true;
    }
  }

  const destinations = new Map<string, DestinationInfo | null>();
  for (const aircraftItem of aircraft) {
    const cached = cache.get(aircraftItem.icao24);
    destinations.set(aircraftItem.icao24, cached === undefined ? null : cached);
  }
  return { enrichment: hadFailure ? 'partial' : 'complete', destinations };
}

/**
 * Create the shared fly-over service bound to a feed.
 *
 * The service re-validates its input against the shared schema (single source
 * of truth) so every caller — REST and MCP — gets identical validation.
 *
 * @param feed - the aircraft feed to query
 * @param routeFeed - optional flight-route feed for origin/destination
 *   enrichment; when absent the result reports `destinationEnrichment:
 *   'unavailable'`
 * @param options - enrichment tuning (defaults from runtime config)
 * @returns a {@link FlyOverService}
 */
export function createFlyOverService(
  feed: AircraftFeed,
  routeFeed?: FlightRouteFeed,
  options: FlyOverServiceOptions = {},
): FlyOverService {
  const cfg = loadConfig();
  const cache = createDestinationCache({
    ttlMs: options.destinationCacheTtlMs ?? cfg.destinationCacheTtlMs,
    negativeTtlMs: options.destinationNegativeTtlMs ?? cfg.destinationNegativeTtlMs,
  });
  const snapshotCache = createSnapshotCache({
    ttlMs: options.snapshotCacheTtlMs ?? cfg.snapshotCacheTtlMs,
  });

  return {
    async query(input: LocationQuery): Promise<FlyOverResult> {
      const parsed = LocationQuerySchema.safeParse(input);
      if (!parsed.success) {
        throw new ValidationError('Invalid location query', formatZodError(parsed.error));
      }

      const { lat, lng, radiusKm } = parsed.data;
      const snapshotKey = `${lat}|${lng}|${radiusKm}`;
      const cached = snapshotCache.get(snapshotKey);
      const snapshot = cached ?? (await feed.getSnapshot(lat, lng, radiusKm));
      if (cached === undefined) snapshotCache.set(snapshotKey, snapshot);

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
      let destinations: Map<string, DestinationInfo | null> | null = null;

      if (routeFeed === undefined) {
        destinationEnrichment = 'unavailable';
      } else {
        const enriched = await enrichRoutes(aircraft, routeFeed, cache);
        destinationEnrichment = enriched.enrichment;
        destinations = enriched.destinations;
      }

      const enrichedAircraft = aircraft.map((aircraft) => {
        if (destinations === null) return aircraft;
        const info = destinations.get(aircraft.icao24);
        const origin = info?.estDepartureAirport ?? null;
        const destination = info?.estArrivalAirport ?? null;
        return {
          ...aircraft,
          originAirport: origin?.icao ?? null,
          originCity: origin?.city ?? null,
          originAirportName: origin?.name ?? null,
          originCountry:
            countryForIso2(origin?.countryIso2 ?? null) ?? countryForIcao(origin?.icao ?? null),
          destinationAirport: destination?.icao ?? null,
          destinationCity: destination?.city ?? null,
          destinationAirportName: destination?.name ?? null,
          destinationCountry:
            countryForIso2(destination?.countryIso2 ?? null) ??
            countryForIcao(destination?.icao ?? null),
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
