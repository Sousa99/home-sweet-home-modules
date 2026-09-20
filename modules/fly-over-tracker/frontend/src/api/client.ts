import type { ApiErrorBody, FieldError, FlyOverResult, LocationQuery } from './types';

/**
 * Maximum accepted query radius in kilometers, mirrored from the backend
 * default (`backend/src/lib/config.ts`). Used for client-side validation.
 */
export const MAX_RADIUS_KM = 500;

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
 * @returns the fly-over result
 * @throws {ApiError} when the request fails or the API returns an error
 */
export async function getFlyOvers(query: LocationQuery): Promise<FlyOverResult> {
  const params = new URLSearchParams({
    lat: String(query.lat),
    lng: String(query.lng),
    radiusKm: String(query.radiusKm),
  });

  const res = await fetch(`/api/fly-overs?${params.toString()}`);
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
