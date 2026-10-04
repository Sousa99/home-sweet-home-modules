import { describe, expect, it } from 'vitest';
import * as surface from '../../index';

/**
 * Locks the published surface of @sousa99/weather-psychic-components: exactly
 * the widgets, their prop types, the injectable fetcher types, and the shared
 * API types. Renaming/removing an export, or leaking an internal member, must
 * fail here (see `specs/007-weather-psychic/contracts/frontend-api.md`).
 */
describe('public package surface', () => {
  it('exports the three widgets', () => {
    expect(surface.CurrentWeatherCard).toBeTypeOf('function');
    expect(surface.DailyForecastCard).toBeTypeOf('function');
    expect(surface.LocationSelector).toBeTypeOf('function');
  });

  it('exports exactly the three widgets (no internal value leaks)', () => {
    expect(Object.keys(surface).sort()).toEqual(
      ['CurrentWeatherCard', 'DailyForecastCard', 'LocationSelector'].sort(),
    );
  });

  it('does not leak internal members', () => {
    const keys = Object.keys(surface);
    expect(keys).not.toContain('getForecast');
    expect(keys).not.toContain('searchLocations');
    expect(keys).not.toContain('useLocation');
    expect(keys).not.toContain('DashboardPage');
    expect(keys).not.toContain('Card');
    expect(keys).not.toContain('HourlyStrip');
  });
});
