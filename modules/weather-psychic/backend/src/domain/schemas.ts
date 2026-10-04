import { z } from 'zod';

/**
 * Shared zod schemas for weather-psychic.
 *
 * These are the single source of truth consumed by the REST endpoints (via
 * `zValidator`) and the MCP tools (via `inputSchema`), so both interfaces
 * accept and return identical payloads (parity by construction).
 */

export const LocationSchema = z.object({
  id: z.number().int(),
  name: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().min(1),
  country: z.string().optional(),
  admin1: z.string().optional(),
});

/** Query for the location search (geocoding). */
export const LocationQuerySchema = z.object({
  query: z.string().min(2).trim(),
});

/** Query for a forecast: a WGS84 coordinate. */
export const ForecastQuerySchema = z.object({
  lat: z.coerce.number().finite().min(-90).max(90),
  lng: z.coerce.number().finite().min(-180).max(180),
});

export const CurrentWeatherSchema = z.object({
  time: z.string(),
  temperature: z.number(),
  apparentTemperature: z.number(),
  weatherCode: z.number().int(),
  condition: z.string(),
  humidity: z.number(),
  windSpeed: z.number(),
  windDirection: z.number(),
  precipitationProbability: z.number(),
  uvIndex: z.number(),
  isDay: z.boolean(),
});

export const HourlyEntrySchema = z.object({
  time: z.string(),
  temperature: z.number(),
  weatherCode: z.number().int(),
  condition: z.string(),
  precipitationProbability: z.number(),
  isDay: z.boolean(),
});

export const DailyEntrySchema = z.object({
  date: z.string(),
  weatherCode: z.number().int(),
  condition: z.string(),
  temperatureMin: z.number(),
  temperatureMax: z.number(),
  precipitationProbability: z.number(),
});

export const ForecastSchema = z.object({
  location: LocationSchema,
  current: CurrentWeatherSchema,
  hourly: z.array(HourlyEntrySchema),
  daily: z.array(DailyEntrySchema),
  generatedAt: z.string(),
});
