import { describe, expect, it } from 'vitest';
import * as library from '../../index';

describe('library entry', () => {
  it('exports the dashboard widgets', () => {
    expect(library.FlyOverWidget).toBeTypeOf('function');
    expect(library.ClosestAircraftCard).toBeTypeOf('function');
    expect(library.FlyOverMapCard).toBeTypeOf('function');
    expect(library.FlyOverListCard).toBeTypeOf('function');
    expect(library.FlyOverClosestPanel).toBeTypeOf('function');
  });

  it('does not export the SPA components or the API client', () => {
    const surface = library as unknown as Record<string, unknown>;
    for (const name of [
      'FlyOverForm',
      'FlyOverList',
      'FlyOverMap',
      'AircraftCard',
      'AircraftMapCard',
      'PlaneGlyph',
      'RefreshRateSelect',
      'ViewModeToggle',
      'Button',
      'Badge',
      'Card',
      'Input',
      'getFlyOvers',
      'ApiError',
      'MAX_RADIUS_KM',
    ]) {
      expect(surface[name]).toBeUndefined();
    }
  });
});
