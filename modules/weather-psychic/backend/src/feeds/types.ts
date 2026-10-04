import type { CurrentWeather, DailyEntry, HourlyEntry, Location } from '../domain/types';

/**
 * The raw weather payload returned by a provider feed, before the service
 * shapes it into a {@link Forecast} (excludes current hour / current day,
 * orders, adds `generatedAt`).
 */
export interface RawForecast {
  /** The resolved location. */
  location: Location;
  /** Current conditions, when the feed provides them. */
  current: CurrentWeather | null;
  /** Hourly snapshots, ascending by time. */
  hourly: HourlyEntry[];
  /** Daily summaries, ascending by date. */
  daily: DailyEntry[];
}

/**
 * A source of live weather data.
 *
 * Implementations are injected into the shared service so tests and offline
 * development use a deterministic mock feed instead of the live network.
 */
export interface WeatherFeed {
  /**
   * Fetch current, hourly, and daily weather for a coordinate.
   *
   * @param lat - WGS84 latitude in decimal degrees
   * @param lng - WGS84 longitude in decimal degrees
   * @param timezone - IANA timezone name for local-time timestamps
   * @returns the raw forecast payload
   * @throws {ProviderUnavailableError} when the provider cannot be reached
   */
  getForecast(lat: number, lng: number, timezone: string): Promise<RawForecast>;
}

/**
 * A source of location search (geocoding) results.
 */
export interface LocationFeed {
  /**
   * Search for places by name.
   *
   * @param query - the search text (at least 2 chars)
   * @returns matching locations, ascending by relevance (empty when none)
   * @throws {ProviderUnavailableError} when the provider cannot be reached
   */
  search(query: string): Promise<Location[]>;
}
