import type { DailyEntry, Forecast, HourlyEntry, Location } from '../domain/types';
import { ForecastQuerySchema, LocationQuerySchema } from '../domain/schemas';
import type { LocationFeed, WeatherFeed } from '../feeds/types';
import { ValidationError, formatZodError } from '../lib/errors';

export interface WeatherServiceDeps {
  /** The weather feed (live Open-Meteo or mock). */
  weatherFeed: WeatherFeed;
  /** The location/geocoding feed (live Open-Meteo or mock). */
  locationFeed: LocationFeed;
}

/**
 * The forecast capability shared by the REST endpoint and the MCP tools.
 */
export interface WeatherService {
  /**
   * Answer "what is the weather currently and to come" for a coordinate.
   *
   * @param input - the validated forecast query (`{ lat, lng }`)
   * @returns a shaped forecast: hourly starts at the next local hour (current
   *   hour excluded), daily starts tomorrow (today excluded), both ascending,
   *   with a server `generatedAt`
   * @throws {ValidationError} when the input does not satisfy the schema
   * @throws {ProviderUnavailableError} when the provider cannot be reached
   */
  getForecast(input: { lat: number; lng: number }): Promise<Forecast>;

  /**
   * Search for places by name.
   *
   * @param query - the search text (at least 2 chars)
   * @returns matching locations
   * @throws {ValidationError} when the query is invalid
   * @throws {ProviderUnavailableError} when the provider cannot be reached
   */
  searchLocations(query: string): Promise<Location[]>;
}

/**
 * Create the shared weather service bound to the feeds.
 *
 * The service re-validates its input against the shared schema (single source
 * of truth) so every caller — REST and MCP — gets identical validation, then
 * shapes the raw feed payload into the contract {@link Forecast} shape.
 *
 * @param deps - the weather and location feeds
 * @returns a {@link WeatherService}
 */
export function createWeatherService(deps: WeatherServiceDeps): WeatherService {
  return {
    async getForecast(input: { lat: number; lng: number }): Promise<Forecast> {
      const parsed = ForecastQuerySchema.safeParse(input);
      if (!parsed.success) {
        throw new ValidationError('Invalid forecast query', formatZodError(parsed.error));
      }
      const { lat, lng } = parsed.data;

      const raw = await deps.weatherFeed.getForecast(lat, lng, 'auto');
      if (raw.current === null) {
        throw new ValidationError('Provider returned no current conditions');
      }
      const reference = raw.current.time;

      const hourly = shapeHourly(raw.hourly, reference);
      const daily = shapeDaily(raw.daily, reference);

      return {
        location: raw.location,
        current: raw.current,
        hourly,
        daily,
        generatedAt: new Date().toISOString(),
      };
    },

    async searchLocations(query: string) {
      const parsed = LocationQuerySchema.safeParse({ query });
      if (!parsed.success) {
        throw new ValidationError('Invalid location query', formatZodError(parsed.error));
      }
      return deps.locationFeed.search(parsed.data.query);
    },
  };
}

/**
 * Keep only hourly entries strictly after the current local hour, ascending.
 */
function shapeHourly(hourly: HourlyEntry[], reference: string): HourlyEntry[] {
  const referenceMs = Date.parse(reference);
  if (Number.isNaN(referenceMs)) return [...hourly];
  const currentHourFloor = Math.floor(referenceMs / 3_600_000) * 3_600_000;
  return hourly
    .filter((entry) => Date.parse(entry.time) > currentHourFloor)
    .sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
}

/**
 * Keep only daily entries strictly after the current local date, ascending.
 */
function shapeDaily(daily: DailyEntry[], reference: string): DailyEntry[] {
  const today = reference.slice(0, 10);
  return daily.filter((entry) => entry.date > today).sort((a, b) => a.date.localeCompare(b.date));
}
