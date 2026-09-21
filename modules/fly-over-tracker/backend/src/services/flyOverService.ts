import type { Aircraft, FlyOverResult, LocationQuery } from '../domain/types';
import { LocationQuerySchema } from '../domain/schemas';
import type { FeedState } from '../feeds/types';
import type { AircraftFeed } from '../feeds/types';
import { bboxFromCircle, haversineKm } from '../geometry';
import { ValidationError, formatZodError } from '../lib/errors';

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

function toAircraft(
  state: FeedState & { latitude: number; longitude: number },
  distanceKm: number,
): Aircraft {
  return {
    icao24: state.icao24,
    callsign: state.callsign,
    originCountry: state.originCountry,
    // Destination requires a flight/route lookup that the live feed does not
    // provide; leave null until such a source is wired up.
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
 * Create the shared fly-over service bound to a feed.
 *
 * The service re-validates its input against the shared schema (single source
 * of truth) so every caller — REST and MCP — gets identical validation.
 *
 * @param feed - the aircraft feed to query
 * @returns a {@link FlyOverService}
 */
export function createFlyOverService(feed: AircraftFeed): FlyOverService {
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

      return {
        center: { lat, lng },
        radiusKm,
        asOf: snapshot.time,
        count: aircraft.length,
        aircraft,
      };
    },
  };
}
