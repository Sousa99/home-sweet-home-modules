import { describe, expect, it } from 'vitest';
import { bboxFromCircle, haversineKm } from '../../geometry';

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

describe('bboxFromCircle', () => {
  it('produces ~1 degree spans for a 111.19 km radius at the equator', () => {
    const bbox = bboxFromCircle(0, 0, 111.19);
    expect(bbox.latMin).toBeCloseTo(-1, 1);
    expect(bbox.latMax).toBeCloseTo(1, 1);
    expect(bbox.lngMin).toBeCloseTo(-1, 1);
    expect(bbox.lngMax).toBeCloseTo(1, 1);
  });

  it('widens the longitude span with latitude (cosine scaling)', () => {
    const atEquator = bboxFromCircle(0, 0, 500);
    const atParis = bboxFromCircle(48.8566, 0, 500);
    const equatorSpan = atEquator.lngMax - atEquator.lngMin;
    const parisSpan = atParis.lngMax - atParis.lngMin;
    expect(parisSpan).toBeGreaterThan(equatorSpan);
  });

  it('clamps latitude to the valid range', () => {
    const bbox = bboxFromCircle(89, 0, 500);
    expect(bbox.latMax).toBe(90);
    expect(bbox.latMin).toBeGreaterThan(0);
  });

  it('covers the full longitude range at the poles', () => {
    const bbox = bboxFromCircle(90, 0, 500);
    expect(bbox.lngMin).toBe(-180);
    expect(bbox.lngMax).toBe(180);
  });

  it('clamps longitude at the antimeridian (documented MVP limitation)', () => {
    const bbox = bboxFromCircle(0, 179.9, 500);
    expect(bbox.lngMax).toBe(180);
    expect(bbox.lngMin).toBeGreaterThan(174);
  });
});
