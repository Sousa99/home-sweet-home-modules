import type { BoundingBox } from '../geometry';

/**
 * A normalized aircraft state as reported by a position feed.
 *
 * Position (`latitude`, `longitude`) may be `null` when the feed has no
 * current position for the aircraft; the service filters those out.
 */
export interface FeedState {
  icao24: string;
  callsign: string | null;
  originCountry: string | null;
  latitude: number | null;
  longitude: number | null;
  /** Barometric altitude in meters. */
  baroAltitude: number | null;
  onGround: boolean;
  /** Ground speed in meters per second. */
  velocity: number | null;
  /** Track angle in degrees. */
  trueTrack: number | null;
  /** Vertical rate in meters per second. */
  verticalRate: number | null;
}

/**
 * A point-in-time snapshot of aircraft states.
 */
export interface FeedSnapshot {
  /** Unix seconds the snapshot reflects the feed. */
  time: number;
  states: FeedState[];
}

/**
 * A source of live aircraft positions.
 *
 * Implementations are injected into the shared service so tests and offline
 * development use a deterministic mock feed instead of the live network.
 */
export interface AircraftFeed {
  /**
   * Fetch the current aircraft states inside a bounding box.
   *
   * @param bbox - the bounding box to query
   * @returns a snapshot of states with positions inside (or near) the box
   */
  getSnapshot(bbox: BoundingBox): Promise<FeedSnapshot>;
}

/**
 * The route/destination information identified for a single flight.
 */
export interface DestinationInfo {
  /** The aircraft these route details belong to. */
  icao24: string;
  /** ICAO code of the estimated departure airport, when identified. */
  estDepartureAirport: string | null;
  /** ICAO code of the estimated arrival airport, when identified. */
  estArrivalAirport: string | null;
}

/**
 * A source of flight route/destination data, keyed by aircraft identity.
 *
 * Kept separate from {@link AircraftFeed} so the position source and the
 * route source are independently mockable and independently rate-limited,
 * mirroring the OpenSky credit-bucket model.
 */
export interface FlightRouteFeed {
  /**
   * Resolve the estimated destination for a single aircraft.
   *
   * @param icao24 - the aircraft's ICAO 24-bit transponder address (hex)
   * @returns the identified destination info, or `null` when the route is
   *   unknown or no current flight is found
   * @throws {FeedUnavailableError} when the route source cannot be reached
   */
  getDestination(icao24: string): Promise<DestinationInfo | null>;
}
