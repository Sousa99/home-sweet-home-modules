import { describe, expect, it } from 'vitest';
import {
  AircraftSchema,
  CenterSchema,
  createLocationQuerySchema,
  FlyOverResultSchema,
  LocationQuerySchema,
} from '../../domain/schemas';

const aircraftFixture = {
  icao24: '3c6444',
  callsign: 'DLH400',
  originCountry: 'Germany',
  destinationAirport: null,
  destinationCountry: null,
  latitude: 48.9211,
  longitude: 2.4288,
  altitude: 9144.0,
  onGround: false,
  velocity: 251.2,
  trueTrack: 87.5,
  verticalRate: 0.0,
  distanceKm: 8.2,
};

describe('LocationQuerySchema', () => {
  it('accepts valid numeric input', () => {
    const result = LocationQuerySchema.safeParse({
      lat: 48.8566,
      lng: 2.3522,
      radiusKm: 50,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ lat: 48.8566, lng: 2.3522, radiusKm: 50 });
    }
  });

  it('coerces string values (REST query params)', () => {
    const result = LocationQuerySchema.safeParse({
      lat: '48.8566',
      lng: '2.3522',
      radiusKm: '50',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.radiusKm).toBe(50);
    }
  });

  it('rejects out-of-range coordinates and radii', () => {
    expect(LocationQuerySchema.safeParse({ lat: 91, lng: 2, radiusKm: 50 }).success).toBe(false);
    expect(LocationQuerySchema.safeParse({ lat: -91, lng: 2, radiusKm: 50 }).success).toBe(false);
    expect(LocationQuerySchema.safeParse({ lat: 0, lng: 181, radiusKm: 50 }).success).toBe(false);
    expect(LocationQuerySchema.safeParse({ lat: 0, lng: 0, radiusKm: 0 }).success).toBe(false);
    expect(LocationQuerySchema.safeParse({ lat: 0, lng: 0, radiusKm: -5 }).success).toBe(false);
    expect(LocationQuerySchema.safeParse({ lat: 0, lng: 0, radiusKm: 501 }).success).toBe(false);
  });

  it('accepts boundary values', () => {
    expect(LocationQuerySchema.safeParse({ lat: 90, lng: 180, radiusKm: 500 }).success).toBe(true);
    expect(LocationQuerySchema.safeParse({ lat: -90, lng: -180, radiusKm: 500 }).success).toBe(
      true,
    );
  });

  it('strips unknown keys', () => {
    const result = LocationQuerySchema.safeParse({
      lat: 1,
      lng: 2,
      radiusKm: 3,
      extra: 'ignored',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ lat: 1, lng: 2, radiusKm: 3 });
    }
  });

  it('rejects missing and non-numeric fields', () => {
    expect(LocationQuerySchema.safeParse({ lat: 1, lng: 2 }).success).toBe(false);
    expect(LocationQuerySchema.safeParse({ lat: 'x', lng: 2, radiusKm: 3 }).success).toBe(false);
  });

  it('respects a custom maximum radius from the factory', () => {
    const schema = createLocationQuerySchema({ maxRadiusKm: 100 });
    expect(schema.safeParse({ lat: 0, lng: 0, radiusKm: 100 }).success).toBe(true);
    expect(schema.safeParse({ lat: 0, lng: 0, radiusKm: 200 }).success).toBe(false);
  });
});

describe('CenterSchema', () => {
  it('parses a center point', () => {
    expect(CenterSchema.safeParse({ lat: 1.5, lng: -2.5 }).success).toBe(true);
  });
});

describe('AircraftSchema', () => {
  it('accepts a full aircraft with nullable flight-state fields', () => {
    expect(AircraftSchema.safeParse(aircraftFixture).success).toBe(true);
  });

  it('accepts null for nullable fields', () => {
    const result = AircraftSchema.safeParse({
      ...aircraftFixture,
      callsign: null,
      altitude: null,
      velocity: null,
      trueTrack: null,
      verticalRate: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const withoutIcao: Record<string, unknown> = { ...aircraftFixture };
    delete withoutIcao.icao24;
    expect(AircraftSchema.safeParse(withoutIcao).success).toBe(false);
  });
});

describe('FlyOverResultSchema', () => {
  it('parses a full result', () => {
    const result = FlyOverResultSchema.safeParse({
      center: { lat: 48.8566, lng: 2.3522 },
      radiusKm: 50,
      asOf: 1_726_900_000,
      count: 1,
      aircraft: [aircraftFixture],
    });
    expect(result.success).toBe(true);
  });

  it('parses an empty result', () => {
    const result = FlyOverResultSchema.safeParse({
      center: { lat: 0, lng: 0 },
      radiusKm: 10,
      asOf: 1_726_900_000,
      count: 0,
      aircraft: [],
    });
    expect(result.success).toBe(true);
  });

  it('requires integer asOf and count', () => {
    const base = {
      center: { lat: 0, lng: 0 },
      radiusKm: 10,
      asOf: 1_726_900_000,
      count: 0,
      aircraft: [],
    };
    expect(FlyOverResultSchema.safeParse({ ...base, asOf: 1.5 }).success).toBe(false);
    expect(FlyOverResultSchema.safeParse({ ...base, count: 0.5 }).success).toBe(false);
  });
});
