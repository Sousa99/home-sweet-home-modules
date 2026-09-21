import type { DestinationInfo, FlightRouteFeed, RouteLookup } from './types';

/**
 * Deterministic fixture destinations keyed by the mock feed's aircraft
 * identities (`backend/src/feeds/mock.ts`). Airport metadata mirrors the
 * adsb.lol standing-data route files.
 */
const FIXTURE_DESTINATIONS: Record<string, DestinationInfo> = {
  '3c6444': {
    icao24: '3c6444',
    estDepartureAirport: {
      icao: 'LFPG',
      city: 'Paris',
      name: 'Paris Charles de Gaulle Airport',
      countryIso2: 'FR',
    },
    estArrivalAirport: {
      icao: 'EDDF',
      city: 'Frankfurt-am-Main',
      name: 'Frankfurt Airport',
      countryIso2: 'DE',
    },
  },
  '3946b0': {
    icao24: '3946b0',
    estDepartureAirport: {
      icao: 'LEMD',
      city: 'Madrid',
      name: 'Adolfo Suárez Madrid–Barajas Airport',
      countryIso2: 'ES',
    },
    estArrivalAirport: {
      icao: 'LFPG',
      city: 'Paris',
      name: 'Paris Charles de Gaulle Airport',
      countryIso2: 'FR',
    },
  },
  '4caa01': {
    icao24: '4caa01',
    estDepartureAirport: {
      icao: 'LFPG',
      city: 'Paris',
      name: 'Paris Charles de Gaulle Airport',
      countryIso2: 'FR',
    },
    estArrivalAirport: {
      icao: 'EGLL',
      city: 'London',
      name: 'London Heathrow Airport',
      countryIso2: 'GB',
    },
  },
  a0ae62: {
    icao24: 'a0ae62',
    estDepartureAirport: {
      icao: 'KLAX',
      city: 'Los Angeles',
      name: 'Los Angeles International Airport',
      countryIso2: 'US',
    },
    estArrivalAirport: {
      icao: 'KSFO',
      city: 'San Francisco',
      name: 'San Francisco International Airport',
      countryIso2: 'US',
    },
  },
  '4840d6': {
    icao24: '4840d6',
    estDepartureAirport: {
      icao: 'EGLL',
      city: 'London',
      name: 'London Heathrow Airport',
      countryIso2: 'GB',
    },
    estArrivalAirport: {
      icao: 'EHAM',
      city: 'Amsterdam',
      name: 'Amsterdam Airport Schiphol',
      countryIso2: 'NL',
    },
  },
};

export interface MockRouteFeedOptions {
  /** Override destinations per aircraft identity (defaults to the fixtures). */
  destinations?: Record<string, DestinationInfo | null>;
}

/**
 * Deterministic flight-route feed for tests and offline development. Returns
 * the fixture destinations for a batch of lookups and tracks the number of
 * batches performed, so tests can assert cache behaviour.
 */
export class MockRouteFeed implements FlightRouteFeed {
  private readonly destinations: Record<string, DestinationInfo | null>;
  /** Number of `resolveRoutes` calls performed. */
  callCount = 0;

  constructor(options: MockRouteFeedOptions = {}) {
    this.destinations = options.destinations ?? FIXTURE_DESTINATIONS;
  }

  /**
   * Return the fixture destination for each lookup, or `null` when unknown.
   *
   * @param lookups - the aircraft to resolve
   * @returns a map from `icao24` to the fixture destination info or `null`
   */
  async resolveRoutes(
    lookups: readonly RouteLookup[],
  ): Promise<Map<string, DestinationInfo | null>> {
    this.callCount += 1;
    return new Map(
      lookups.map((lookup) => [lookup.icao24, this.destinations[lookup.icao24] ?? null]),
    );
  }
}
