import { describe, expect, it } from 'vitest';
import { haversineKm } from '../../geometry';

describe('haversineKm', () => {
  it('returns 0 for the same point', () => {
    expect(haversineKm(48.8566, 2.3522, 48.8566, 2.3522)).toBe(0);
  });

  it('is ~111.19 km for one degree of latitude at the equator', () => {
    expect(haversineKm(0, 0, 1, 0)).toBeCloseTo(111.19, 1);
  });

  it('is ~344 km between Paris and London', () => {
    expect(haversineKm(48.8566, 2.3522, 51.5074, -0.1278)).toBeCloseTo(344, 0);
  });

  it('is symmetric', () => {
    const ab = haversineKm(48.8566, 2.3522, 51.5074, -0.1278);
    const ba = haversineKm(51.5074, -0.1278, 48.8566, 2.3522);
    expect(ba).toBeCloseTo(ab, 6);
  });
});
