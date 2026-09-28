import { getApiBaseUrl } from './baseUrl';
import type { ApiErrorBody, FieldError, FlyOverResult, LocationQuery } from './types';

/**
 * Maximum accepted query radius in kilometers, mirrored from the backend
 * default (`backend/src/lib/config.ts`). Bounded by the adsb.lol `/v2/point`
 * endpoint's 250 nm (~463 km) radius cap. Used for client-side validation.
 */
export const MAX_RADIUS_KM = 463;

/**
 * Error thrown when the fly-over API returns a non-OK response.
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

/**
 * Query the backend for the aircraft currently over a GPS point and radius.
 *
 * @param query - the location query
 * @param baseUrl - base URL of the module backend; when empty the request
 * targets the same-origin `/api/fly-overs`. Defaults to the value configured
 * at runtime via `loadApiBaseUrl()` (`/config.json`, from the `API_BASE_URL`
 * environment variable). Used by the embeddable dashboard widgets to point at
 * a remote backend.
 * @returns the fly-over result
 * @throws {ApiError} when the request fails or the API returns an error
 */
export async function getFlyOvers(
  query: LocationQuery,
  baseUrl: string = getApiBaseUrl(),
): Promise<FlyOverResult> {
  const params = new URLSearchParams({
    lat: String(query.lat),
    lng: String(query.lng),
    radiusKm: String(query.radiusKm),
  });

  const res = await fetch(`${baseUrl}/api/fly-overs?${params.toString()}`);
  const body = (await res.json()) as FlyOverResult | ApiErrorBody;

  if (!res.ok) {
    const errorBody = body as ApiErrorBody;
    throw new ApiError(errorBody.message ?? 'Request failed', {
      status: res.status,
      errors: errorBody.errors,
    });
  }

  return body as FlyOverResult;
}
