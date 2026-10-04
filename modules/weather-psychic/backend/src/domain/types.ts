/**
 * Shared domain types for weather-psychic.
 *
 * These are the objects that travel between the backend (REST + MCP) and the
 * frontend. Field semantics follow `specs/007-weather-psychic/data-model.md`.
 */

/** A resolved, selectable place whose weather is displayed. */
export interface Location {
  /** Provider geocoding id. */
  id: number;
  /** Display name (e.g. "Lisbon"). */
  name: string;
  /** WGS84 latitude in decimal degrees. */
  latitude: number;
  /** WGS84 longitude in decimal degrees. */
  longitude: number;
  /** IANA timezone name (e.g. `Europe/Lisbon`). */
  timezone: string;
  /** Country name, when the provider returns it. */
  country?: string;
  /** First-level administrative area, when available. */
  admin1?: string;
}

/** The weather at a location at the current moment. */
export interface CurrentWeather {
  /** Local-time ISO-8601 timestamp of the observation. */
  time: string;
  /** Air temperature at 2m, °C. */
  temperature: number;
  /** Feels-like temperature, °C. */
  apparentTemperature: number;
  /** WMO weather code (0–99). */
  weatherCode: number;
  /** Human label derived from the WMO code. */
  condition: string;
  /** Relative humidity, %. */
  humidity: number;
  /** 10m wind speed, km/h. */
  windSpeed: number;
  /** Wind direction in degrees, `[0, 360)`. */
  windDirection: number;
  /** Chance of precipitation, %. */
  precipitationProbability: number;
  /** UV index. */
  uvIndex: number;
  /** Day/night flag from the provider. */
  isDay: boolean;
}

/** One hour of the hourly forecast strip. */
export interface HourlyEntry {
  /** Local-time ISO-8601 hour timestamp. */
  time: string;
  /** Air temperature, °C. */
  temperature: number;
  /** WMO weather code. */
  weatherCode: number;
  /** Human label derived from the WMO code. */
  condition: string;
  /** Chance of precipitation, %. */
  precipitationProbability: number;
  /** Day/night flag. */
  isDay: boolean;
}

/** One day of the daily forecast list. */
export interface DailyEntry {
  /** ISO-8601 date of the forecast day. */
  date: string;
  /** WMO weather code. */
  weatherCode: number;
  /** Human label derived from the WMO code. */
  condition: string;
  /** Daily minimum temperature, °C. */
  temperatureMin: number;
  /** Daily maximum temperature, °C. */
  temperatureMax: number;
  /** Chance of precipitation, %. */
  precipitationProbability: number;
}

/** The complete weather payload returned for one location. */
export interface Forecast {
  /** The requested location, echoed back. */
  location: Location;
  /** Current conditions. */
  current: CurrentWeather;
  /** Coming hours; first entry is the next hour (current hour excluded). */
  hourly: HourlyEntry[];
  /** Coming days; first entry is tomorrow (today excluded). */
  daily: DailyEntry[];
  /** Server-side generation timestamp. */
  generatedAt: string;
}
