/**
 * Shared response types for the weather-psychic API.
 *
 * These mirror the backend schemas (`backend/src/domain/schemas.ts`) and the
 * domain objects in `specs/007-weather-psychic/data-model.md`.
 */

/** A resolved, selectable place whose weather is displayed. */
export interface Location {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  country?: string;
  admin1?: string;
}

/** The weather at a location at the current moment. */
export interface CurrentWeather {
  time: string;
  temperature: number;
  apparentTemperature: number;
  weatherCode: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  precipitationProbability: number;
  uvIndex: number;
  isDay: boolean;
}

/** One hour of the hourly forecast strip. */
export interface HourlyEntry {
  time: string;
  temperature: number;
  weatherCode: number;
  condition: string;
  precipitationProbability: number;
  isDay: boolean;
}

/** One day of the daily forecast list. */
export interface DailyEntry {
  date: string;
  weatherCode: number;
  condition: string;
  temperatureMin: number;
  temperatureMax: number;
  precipitationProbability: number;
}

/** The complete weather payload returned for one location. */
export interface Forecast {
  location: Location;
  current: CurrentWeather;
  hourly: HourlyEntry[];
  daily: DailyEntry[];
  generatedAt: string;
}

/** A location-search response. */
export interface LocationSearchResponse {
  results: Location[];
}

/** The shared error body returned by the backend. */
export interface ApiErrorBody {
  success: false;
  message: string;
  errors?: FieldError[];
}

/** A field-level validation error entry. */
export interface FieldError {
  field: string;
  message: string;
}
