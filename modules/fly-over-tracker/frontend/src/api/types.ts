/**
 * Frontend mirror of the backend fly-over domain types.
 *
 * The module ships only the `backend` and `frontend` packages (no shared
 * package), so these types mirror `backend/src/domain/types.ts`. Parity
 * between the two is guaranteed by the backend contract tests and asserted
 * here by the client tests.
 */

export interface LocationQuery {
  lat: number;
  lng: number;
  radiusKm: number;
}

export interface Center {
  lat: number;
  lng: number;
}

export interface Aircraft {
  icao24: string;
  callsign: string | null;
  /** Estimated origin airport (ICAO code); null until a lookup source exists. */
  originAirport: string | null;
  /** City of the origin airport, when the route lookup provides it. */
  originCity: string | null;
  /** Full name of the origin airport, when the route lookup provides it. */
  originAirportName: string | null;
  originCountry: string | null;
  /** Estimated destination airport (ICAO code); null until a lookup source exists. */
  destinationAirport: string | null;
  /** City of the destination airport, when the route lookup provides it. */
  destinationCity: string | null;
  /** Full name of the destination airport, when the route lookup provides it. */
  destinationAirportName: string | null;
  /** Country of the destination airport; null until a lookup source exists. */
  destinationCountry: string | null;
  latitude: number;
  longitude: number;
  /** Barometric altitude in meters. */
  altitude: number | null;
  onGround: boolean;
  /** Ground speed in meters per second. */
  velocity: number | null;
  /** Track angle in degrees. */
  trueTrack: number | null;
  /** Vertical rate in meters per second. */
  verticalRate: number | null;
  /** Great-circle distance from the query center in kilometers. */
  distanceKm: number;
}

export interface FlyOverResult {
  center: Center;
  radiusKm: number;
  /** Unix seconds the result reflects the feed. */
  asOf: number;
  count: number;
  /** Destination enrichment state: complete, partial, or unavailable. */
  destinationEnrichment: 'complete' | 'partial' | 'unavailable';
  aircraft: Aircraft[];
}

export interface FieldError {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  success: boolean;
  message: string;
  errors?: FieldError[];
}
