/**
 * Earth's mean radius in kilometers, used by {@link haversineKm}.
 */
export const EARTH_RADIUS_KM = 6371;

/** Approximate kilometers per degree of latitude. */
const KM_PER_DEG_LAT = 111.19;

/**
 * A latitude/longitude bounding box in decimal degrees.
 */
export interface BoundingBox {
  latMin: number;
  lngMin: number;
  latMax: number;
  lngMax: number;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Great-circle distance between two WGS84 points using the haversine formula.
 *
 * @param lat1 - latitude of the first point in decimal degrees
 * @param lng1 - longitude of the first point in decimal degrees
 * @param lat2 - latitude of the second point in decimal degrees
 * @param lng2 - longitude of the second point in decimal degrees
 * @returns the distance in kilometers
 */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Compute the bounding box that fully contains a circle of the given radius
 * around a center point.
 *
 * The box is a superset of the circle (the corners stick out); the exact
 * circular filter is applied afterwards with {@link haversineKm}.
 *
 * **MVP limitation**: the box is clamped to `[-90, 90]` latitude and
 * `[-180, 180]` longitude. A box that would straddle the antimeridian is
 * clamped instead of wrapped, so aircraft on the far side of the date line
 * near the edge of a large radius may be missed. Near the poles the longitude
 * span is widened to the full `[-180, 180]` range.
 *
 * @param lat - center latitude in decimal degrees
 * @param lng - center longitude in decimal degrees
 * @param radiusKm - circle radius in kilometers
 * @returns the containing bounding box
 */
export function bboxFromCircle(lat: number, lng: number, radiusKm: number): BoundingBox {
  const latDelta = radiusKm / KM_PER_DEG_LAT;
  const cosLat = Math.abs(Math.cos(toRadians(lat)));
  const lngDelta = cosLat < 1e-9 ? 180 : radiusKm / (KM_PER_DEG_LAT * cosLat);
  return {
    latMin: clamp(lat - latDelta, -90, 90),
    latMax: clamp(lat + latDelta, -90, 90),
    lngMin: clamp(lng - lngDelta, -180, 180),
    lngMax: clamp(lng + lngDelta, -180, 180),
  };
}
