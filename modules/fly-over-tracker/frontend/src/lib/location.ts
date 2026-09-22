import { MAX_RADIUS_KM } from '../api/client';
import type { LocationQuery } from '../api/types';

export { MAX_RADIUS_KM };

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/** Smallest radius the map selection allows, in km (avoids degenerate circles). */
export const MIN_RADIUS_KM = 0.1;

function toRad(degrees: number): number {
  return degrees * DEG_TO_RAD;
}

function toDeg(radians: number): number {
  return radians * RAD_TO_DEG;
}

function normalizeLng(lng: number): number {
  return ((lng + 540) % 360) - 180;
}

/** Clamp latitude to the valid range [-90, 90]. */
export function clampLat(lat: number): number {
  return Math.min(90, Math.max(-90, lat));
}

/** Clamp longitude to the valid range [-180, 180]. */
export function clampLng(lng: number): number {
  if (lng >= -180 && lng <= 180) return lng;
  return normalizeLng(lng);
}

/** Clamp a radius to the valid query range (MIN_RADIUS_KM, MAX_RADIUS_KM]. */
export function clampRadiusKm(radiusKm: number): number {
  return Math.min(MAX_RADIUS_KM, Math.max(MIN_RADIUS_KM, radiusKm));
}

export function isValidLat(lat: number): boolean {
  return Number.isFinite(lat) && lat >= -90 && lat <= 90;
}

export function isValidLng(lng: number): boolean {
  return Number.isFinite(lng) && lng >= -180 && lng <= 180;
}

export function isValidRadiusKm(radiusKm: number): boolean {
  return Number.isFinite(radiusKm) && radiusKm > 0 && radiusKm <= MAX_RADIUS_KM;
}

/** Great-circle distance between two points in kilometers (haversine). */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Radius of the circle centered at `center` that passes through `edge`, in km. */
export function radiusKmFromCenterAndEdge(center: LatLng, edge: LatLng): number {
  return haversineKm(center, edge);
}

/** Destination point at `distanceKm` from `center` along `bearingDeg` (0-360). */
export function destPoint(center: LatLng, distanceKm: number, bearingDeg: number): LatLng {
  const angularDistance = distanceKm / EARTH_RADIUS_KM;
  const bearing = toRad(bearingDeg);
  const lat1 = toRad(center.lat);
  const lng1 = toRad(center.lng);
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
    );
  return { lat: toDeg(lat2), lng: normalizeLng(toDeg(lng2)) };
}

/** Initial bearing (degrees, 0-360) from `center` toward `to`. */
export function bearingDegFromCenterTo(center: LatLng, to: LatLng): number {
  const lat1 = toRad(center.lat);
  const lat2 = toRad(to.lat);
  const dLng = toRad(to.lng - center.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Whether two location queries describe exactly the same center and radius. */
export function queriesEqual(a: LocationQuery, b: LocationQuery): boolean {
  return a.lat === b.lat && a.lng === b.lng && a.radiusKm === b.radiusKm;
}
