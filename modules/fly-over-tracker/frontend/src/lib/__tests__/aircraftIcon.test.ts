import { describe, expect, it } from 'vitest';
import { createAircraftIcon } from '../aircraftIcon';

describe('createAircraftIcon', () => {
  it('returns a div icon with a plane SVG', () => {
    const icon = createAircraftIcon(90);
    expect(icon.options.className).toContain('fly-over-aircraft-icon');
    expect(icon.options.html).toContain('<svg');
    expect(icon.options.iconSize).toEqual([24, 24]);
  });

  it('rotates the plane by the trueTrack', () => {
    const icon = createAircraftIcon(45);
    expect(String(icon.options.html)).toContain('rotate(45deg)');
  });

  it('normalizes out-of-range tracks', () => {
    expect(String(createAircraftIcon(405).options.html)).toContain('rotate(45deg)');
    expect(String(createAircraftIcon(-45).options.html)).toContain('rotate(315deg)');
  });

  it('defaults to 0 degrees when the track is unknown', () => {
    expect(String(createAircraftIcon(null).options.html)).toContain('rotate(0deg)');
    expect(String(createAircraftIcon().options.html)).toContain('rotate(0deg)');
  });
});
