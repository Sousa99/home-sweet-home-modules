import { z } from 'zod';
import { DEFAULT_MAX_RADIUS_KM } from '../lib/config';

export interface LocationQuerySchemaOptions {
  /** Maximum accepted radius in kilometers for the query. */
  maxRadiusKm: number;
}

/**
 * Create the location query schema with an explicit radius bound.
 *
 * A factory is used so tests can vary the bound; the default instance is bound
 * to the configured {@link DEFAULT_MAX_RADIUS_KM}. The same schema validates
 * REST query parameters and the MCP `planes_over` tool input, so both
 * interfaces accept identical input (`z.coerce` parses both strings and
 * numbers).
 *
 * @param options - schema options (maximum radius)
 * @returns a zod object schema for `{ lat, lng, radiusKm }`
 */
export function createLocationQuerySchema({ maxRadiusKm }: LocationQuerySchemaOptions) {
  return z.object({
    lat: z.coerce.number().finite().min(-90).max(90),
    lng: z.coerce.number().finite().min(-180).max(180),
    radiusKm: z.coerce.number().finite().positive().max(maxRadiusKm),
  });
}

/**
 * Default location query schema bound to the configured maximum radius.
 */
export const LocationQuerySchema = createLocationQuerySchema({
  maxRadiusKm: DEFAULT_MAX_RADIUS_KM,
});

/**
 * Schema for the center point echoed back in a fly-over result.
 */
export const CenterSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

/**
 * Schema for a single aircraft over the queried area.
 *
 * Nullable fields mirror the feed: identification and flight-state values may
 * be absent while position (`latitude`, `longitude`) is always present — the
 * service only emits aircraft with a known position.
 */
export const AircraftSchema = z.object({
  icao24: z.string(),
  callsign: z.string().nullable(),
  originCountry: z.string().nullable(),
  latitude: z.number(),
  longitude: z.number(),
  altitude: z.number().nullable(),
  onGround: z.boolean(),
  velocity: z.number().nullable(),
  trueTrack: z.number().nullable(),
  verticalRate: z.number().nullable(),
  distanceKm: z.number(),
});

/**
 * Schema for the complete answer to a location query. Shared by the REST
 * endpoint and the MCP `planes_over` tool so both interfaces return the exact
 * same shape (parity by construction).
 */
export const FlyOverResultSchema = z.object({
  center: CenterSchema,
  radiusKm: z.number(),
  /** Unix seconds the result reflects the feed. */
  asOf: z.int(),
  /** Number of aircraft in the list. */
  count: z.int(),
  aircraft: z.array(AircraftSchema),
});
