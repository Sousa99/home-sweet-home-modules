import { describe, expect, it } from 'vitest';
import {
  bearingDegFromCenterTo,
  clampLat,
  clampLng,
  clampRadiusKm,
  destPoint,
  haversineKm,
  isValidLat,
  isValidLng,
  isValidRadiusKm,
  MAX_RADIUS_KM,
  MIN_RADIUS_KM,
  queriesEqual,
  radiusKmFromCenterAndEdge,
} from '../location';

describe('clamp helpers', () => {
  it('clamps latitude to [-90, 90]', () => {
    expect(clampLat(120)).toBe(90);
    expect(clampLat(-120)).toBe(-90);
    expect(clampLat(45)).toBe(45);
  });

  it('clamps and normalizes longitude to [-180, 180]', () => {
    expect(clampLng(200)).toBeCloseTo(-160, 6);
    expect(clampLng(-200)).toBeCloseTo(160, 6);
    expect(clampLng(350)).toBeCloseTo(-10, 6);
    expect(clampLng(45)).toBe(45);
  });

  it('clamps radius to the valid range', () => {
    expect(clampRadiusKm(-5)).toBe(MIN_RADIUS_KM);
    expect(clampRadiusKm(0)).toBe(MIN_RADIUS_KM);
    expect(clampRadiusKm(MAX_RADIUS_KM + 100)).toBe(MAX_RADIUS_KM);
    expect(clampRadiusKm(50)).toBe(50);
  });
});

describe('range validation', () => {
  it('accepts in-range values and rejects out-of-range ones', () => {
    expect(isValidLat(48.8566)).toBe(true);
    expect(isValidLat(90)).toBe(true);
    expect(isValidLat(-90)).toBe(true);
    expect(isValidLat(90.0001)).toBe(false);
    expect(isValidLng(2.3522)).toBe(true);
    expect(isValidLng(180)).toBe(true);
    expect(isValidLng(-181)).toBe(false);
    expect(isValidRadiusKm(50)).toBe(true);
    expect(isValidRadiusKm(0)).toBe(false);
    expect(isValidRadiusKm(-1)).toBe(false);
    expect(isValidRadiusKm(MAX_RADIUS_KM + 1)).toBe(false);
  });
});

describe('haversineKm', () => {
  it('returns zero for identical points', () => {
    expect(haversineKm({ lat: 48.8566, lng: 2.3522 }, { lat: 48.8566, lng: 2.3522 })).toBe(0);
  });

  it('matches a known distance (Paris -> London ~ 344 km)', () => {
    const distance = haversineKm({ lat: 48.8566, lng: 2.3522 }, { lat: 51.5074, lng: -0.1278 });
    expect(distance).toBeGreaterThan(330);
    expect(distance).toBeLessThan(360);
  });
});

describe('radiusKmFromCenterAndEdge', () => {
  it('equals the haversine distance between center and edge', () => {
    const center = { lat: 48.8566, lng: 2.3522 };
    const edge = { lat: 48.9, lng: 2.5 };
    expect(radiusKmFromCenterAndEdge(center, edge)).toBeCloseTo(haversineKm(center, edge), 6);
  });
});

describe('destPoint', () => {
  it('returns the center for a zero distance', () => {
    const center = { lat: 48.8566, lng: 2.3522 };
    const result = destPoint(center, 0, 0);
    expect(result.lat).toBeCloseTo(center.lat, 6);
    expect(result.lng).toBeCloseTo(center.lng, 6);
  });

  it('is roughly consistent with haversineKm round-trip', () => {
    const center = { lat: 48.8566, lng: 2.3522 };
    const edge = destPoint(center, 50, 45);
    const back = haversineKm(center, edge);
    expect(back).toBeGreaterThan(49);
    expect(back).toBeLessThan(51);
  });

  it('moves due north for a 0-degree bearing', () => {
    const center = { lat: 10, lng: 20 };
    const north = destPoint(center, 111.19, 0);
    expect(north.lat).toBeGreaterThan(center.lat);
    expect(north.lng).toBeCloseTo(center.lng, 6);
  });
});

describe('bearingDegFromCenterTo', () => {
  it('returns 0 for a point directly north', () => {
    expect(bearingDegFromCenterTo({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(0, 3);
  });

  it('returns 90 for a point directly east', () => {
    expect(bearingDegFromCenterTo({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(90, 3);
  });

  it('returns a value in [0, 360)', () => {
    const bearing = bearingDegFromCenterTo(
      { lat: 48.8566, lng: 2.3522 },
      { lat: 51.5074, lng: -0.1278 },
    );
    expect(bearing).toBeGreaterThanOrEqual(0);
    expect(bearing).toBeLessThan(360);
  });
});

describe('queriesEqual', () => {
  it('is true for identical queries', () => {
    const query = { lat: 48.8566, lng: 2.3522, radiusKm: 50 };
    expect(queriesEqual(query, { ...query })).toBe(true);
  });

  it('is false when any field differs', () => {
    const query = { lat: 48.8566, lng: 2.3522, radiusKm: 50 };
    expect(queriesEqual(query, { ...query, lat: 40 })).toBe(false);
    expect(queriesEqual(query, { ...query, lng: 3 })).toBe(false);
    expect(queriesEqual(query, { ...query, radiusKm: 100 })).toBe(false);
  });
});
