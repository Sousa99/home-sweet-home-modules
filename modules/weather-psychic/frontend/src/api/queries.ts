import { useQuery } from '@tanstack/react-query';
import { getForecast, searchLocations } from './client';
import type { Forecast, Location } from './types';

/**
 * Fetch the forecast for a location, keyed by coordinate.
 *
 * @param location - the resolved location (or `null` to disable the query)
 * @param baseUrl - optional base-URL override (base-url contract)
 * @param refetchIntervalMs - auto-refresh cadence; `0` disables
 */
export function useForecast(
  location: Location | null,
  baseUrl?: string,
  refetchIntervalMs = 900_000,
) {
  return useQuery({
    queryKey: ['forecast', location?.latitude, location?.longitude],
    queryFn: () =>
      getForecast(
        { lat: location?.latitude as number, lng: location?.longitude as number },
        baseUrl,
      ),
    enabled: location !== null,
    refetchInterval: location !== null && refetchIntervalMs > 0 ? refetchIntervalMs : false,
  });
}

/**
 * Search for locations by name (debounced by the caller).
 *
 * @param query - the search text; the query stays disabled while it is too short
 * @param baseUrl - optional base-URL override (base-url contract)
 */
export function useSearchLocations(query: string, baseUrl?: string) {
  return useQuery({
    queryKey: ['locations', query],
    queryFn: () => searchLocations(query, baseUrl),
    enabled: query.trim().length >= 2,
  });
}

export type { Forecast, Location };
