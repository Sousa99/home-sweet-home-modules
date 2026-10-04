/**
 * WMO weather-code mapping.
 *
 * Maps the WMO weather codes (0–99) returned by the Open-Meteo provider to a
 * human-readable condition label and an icon key. This module-level table is
 * mirrored by the frontend (`src/lib/conditions.ts`); the two stay in sync
 * through a shared fixture (see `src/tests/unit/conditions.test.ts`).
 *
 * The clear-sky entry uses the day icon variant; the frontend swaps it for the
 * night variant based on the `isDay` flag.
 */

export interface WeatherCondition {
  /** Human-readable condition label, e.g. "Partly cloudy". */
  label: string;
  /** Icon key consumed by the frontend icon set, e.g. "partly-cloudy". */
  iconKey: string;
}

/**
 * Map a WMO weather code to its condition.
 *
 * Codes are grouped into families per the WMO 4677 standard as exposed by
 * Open-Meteo. Codes outside the documented set fall back to "Unknown".
 *
 * @param code - the WMO weather code (0–99)
 * @returns the condition label and icon key
 */
export function conditionForCode(code: number): WeatherCondition {
  const entry = CONDITIONS.get(code);
  return entry ?? { label: 'Unknown', iconKey: 'unknown' };
}

/** The full WMO-code → condition table. */
const CONDITIONS: ReadonlyMap<number, WeatherCondition> = new Map<number, WeatherCondition>([
  [0, { label: 'Clear sky', iconKey: 'clear-day' }],
  [1, { label: 'Mainly clear', iconKey: 'partly-cloudy' }],
  [2, { label: 'Partly cloudy', iconKey: 'partly-cloudy' }],
  [3, { label: 'Overcast', iconKey: 'overcast' }],
  [45, { label: 'Fog', iconKey: 'fog' }],
  [48, { label: 'Depositing rime fog', iconKey: 'fog' }],
  [51, { label: 'Light drizzle', iconKey: 'drizzle' }],
  [53, { label: 'Drizzle', iconKey: 'drizzle' }],
  [55, { label: 'Dense drizzle', iconKey: 'drizzle' }],
  [56, { label: 'Freezing drizzle', iconKey: 'drizzle' }],
  [57, { label: 'Dense freezing drizzle', iconKey: 'drizzle' }],
  [61, { label: 'Light rain', iconKey: 'rain' }],
  [63, { label: 'Rain', iconKey: 'rain' }],
  [65, { label: 'Heavy rain', iconKey: 'rain' }],
  [66, { label: 'Freezing rain', iconKey: 'rain' }],
  [67, { label: 'Dense freezing rain', iconKey: 'rain' }],
  [71, { label: 'Light snowfall', iconKey: 'snow' }],
  [73, { label: 'Snowfall', iconKey: 'snow' }],
  [75, { label: 'Heavy snowfall', iconKey: 'snow' }],
  [77, { label: 'Snow grains', iconKey: 'snow' }],
  [80, { label: 'Light rain showers', iconKey: 'rain' }],
  [81, { label: 'Rain showers', iconKey: 'rain' }],
  [82, { label: 'Violent rain showers', iconKey: 'rain' }],
  [85, { label: 'Snow showers', iconKey: 'snow' }],
  [86, { label: 'Heavy snow showers', iconKey: 'snow' }],
  [95, { label: 'Thunderstorm', iconKey: 'thunderstorm' }],
  [96, { label: 'Thunderstorm with hail', iconKey: 'thunderstorm' }],
  [99, { label: 'Thunderstorm with heavy hail', iconKey: 'thunderstorm' }],
]);
