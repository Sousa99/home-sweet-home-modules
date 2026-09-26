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
   * Fetch the current aircraft states inside a circle.
   *
   * @param lat - circle center latitude in decimal degrees
   * @param lng - circle center longitude in decimal degrees
   * @param radiusKm - circle radius in kilometers
   * @returns a snapshot of states with positions inside (or near) the circle
   */
  getSnapshot(lat: number, lng: number, radiusKm: number): Promise<FeedSnapshot>;
}

/**
 * Origin/destination airport metadata resolved for one end of a route.
 */
export interface RouteAirport {
  /** ICAO airport code, e.g. `LPPR`. */
  icao: string;
  /** City the airport serves, e.g. `Porto` (adsb `location`). */
  city: string | null;
  /** Full airport name, e.g. `Francisco de Sá Carneiro Airport`. */
  name: string | null;
  /** ISO 3166-1 alpha-2 country code, e.g. `PT`. */
  countryIso2: string | null;
}

/**
 * The route/destination information identified for a single flight.
 */
export interface DestinationInfo {
  /** The aircraft these route details belong to. */
  icao24: string;
  /** Estimated departure airport, when identified. */
  estDepartureAirport: RouteAirport | null;
  /** Estimated arrival airport, when identified. */
  estArrivalAirport: RouteAirport | null;
}

/**
 * A source of flight route/destination data, keyed by aircraft identity.
 *
 * Kept separate from {@link AircraftFeed} so the position source and the
 * route source are independently mockable and independently rate-limited.
 * Implementations resolve many aircraft in one batched request (the adsb.lol
 * routeset endpoint), so lookups are keyed by the identity of each aircraft.
 */
export interface FlightRouteFeed {
  /**
   * Resolve the route (origin/destination) for a batch of aircraft.
   *
   * @param lookups - the aircraft to resolve
   * @returns a map from `icao24` to its destination info, or `null` when the
   *   route is unknown or the aircraft has no current route
   * @throws {FeedUnavailableError} when the route source cannot be reached
   */
  resolveRoutes(lookups: readonly RouteLookup[]): Promise<Map<string, DestinationInfo | null>>;
}

/**
 * The minimal identity and position needed to resolve an aircraft's route.
 */
export interface RouteLookup {
  /** The aircraft identity the route is resolved for. */
  icao24: string;
  /** The current callsign, when transmitted; route feeds key on this. */
  callsign: string | null;
  /** Current latitude in decimal degrees. */
  latitude: number;
  /** Current longitude in decimal degrees. */
  longitude: number;
}
