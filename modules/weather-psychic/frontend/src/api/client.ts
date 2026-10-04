import { getApiBaseUrl } from './baseUrl';
import type { ApiErrorBody, FieldError, Forecast, Location, LocationSearchResponse } from './types';

/**
 * Error thrown when the weather-psychic API returns a non-OK response.
 */
export class ApiError extends Error {
  /** The HTTP status of the failed response. */
  readonly status: number;
  /** Per-field validation errors, when the API returned them. */
  readonly errors?: FieldError[];

  constructor(message: string, options: { status: number; errors?: FieldError[] }) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status;
    this.errors = options.errors;
  }
}

async function request<T>(path: string, baseUrl: string): Promise<T> {
  const url = baseUrl ? `${baseUrl}/api${path}` : `/api${path}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const body = (await res.json()) as T | ApiErrorBody;

  if (!res.ok) {
    const errorBody = body as ApiErrorBody;
    throw new ApiError(errorBody.message ?? 'Request failed', {
      status: res.status,
      errors: errorBody.errors,
    });
  }

  return body as T;
}

/**
 * Fetch the current + hourly + daily forecast for a coordinate.
 *
 * @param input - the coordinate (`lat`, `lng`)
 * @param baseUrl - base URL of the module backend; when empty the request
 * targets the same-origin `/api/weather`. Defaults to the value configured at
 * runtime via `loadApiBaseUrl()` (`/config.json`, from `API_BASE_URL`).
 * @returns the forecast
 * @throws {ApiError} when the request fails or the API returns an error
 */
export async function getForecast(
  input: { lat: number; lng: number },
  baseUrl: string = getApiBaseUrl(),
): Promise<Forecast> {
  const params = new URLSearchParams({ lat: String(input.lat), lng: String(input.lng) });
  return request<Forecast>(`/weather?${params.toString()}`, baseUrl);
}

/**
 * Search for places by name.
 *
 * @param query - the search text (at least 2 chars)
 * @param baseUrl - base URL of the module backend; empty targets the
 * same-origin `/api/locations/search`. Defaults to the runtime-configured value.
 * @returns matching locations
 * @throws {ApiError} when the request fails or the API returns an error
 */
export async function searchLocations(
  query: string,
  baseUrl: string = getApiBaseUrl(),
): Promise<Location[]> {
  const params = new URLSearchParams({ query });
  const body = await request<LocationSearchResponse>(
    `/locations/search?${params.toString()}`,
    baseUrl,
  );
  return body.results;
}
