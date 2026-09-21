import type { DestinationInfo, FlightRouteFeed } from './types';

/**
 * Deterministic fixture destinations keyed by the mock feed's aircraft
 * identities (`backend/src/feeds/mock.ts`).
 */
const FIXTURE_DESTINATIONS: Record<string, DestinationInfo> = {
  '3c6444': { icao24: '3c6444', estDepartureAirport: 'LFPG', estArrivalAirport: 'EDDF' },
  '3946b0': { icao24: '3946b0', estDepartureAirport: 'LEMD', estArrivalAirport: 'LFPG' },
  '4caa01': { icao24: '4caa01', estDepartureAirport: 'LFPG', estArrivalAirport: 'EGLL' },
  a0ae62: { icao24: 'a0ae62', estDepartureAirport: 'KLAX', estArrivalAirport: 'KSFO' },
  '4840d6': { icao24: '4840d6', estDepartureAirport: 'EGLL', estArrivalAirport: 'EHAM' },
};

export interface MockRouteFeedOptions {
  /** Override destinations per aircraft identity (defaults to the fixtures). */
  destinations?: Record<string, DestinationInfo | null>;
}

/**
 * Deterministic flight-route feed for tests and offline development. Returns
 * the fixture destinations and tracks the number of lookups performed, so
 * tests can assert cache behaviour.
 */
export class MockRouteFeed implements FlightRouteFeed {
  private readonly destinations: Record<string, DestinationInfo | null>;
  /** Number of `getDestination` calls performed. */
  callCount = 0;

  constructor(options: MockRouteFeedOptions = {}) {
    this.destinations = options.destinations ?? FIXTURE_DESTINATIONS;
  }

  /**
   * Return the fixture destination for an aircraft, or `null` when unknown.
   *
   * @param icao24 - the aircraft identity
   * @returns the fixture destination info or `null`
   */
  async getDestination(icao24: string): Promise<DestinationInfo | null> {
    this.callCount += 1;
    return this.destinations[icao24] ?? null;
  }
}
