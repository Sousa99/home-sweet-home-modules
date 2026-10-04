import { describe, expect, it } from 'vitest';
import { conditionForCode } from '../../lib/conditions';

describe('conditionForCode', () => {
  it('maps the clear-sky code to a clear label', () => {
    expect(conditionForCode(0)).toEqual({ label: 'Clear sky', iconKey: 'clear-day' });
  });

  it('maps the partly-cloudy code', () => {
    expect(conditionForCode(2)).toEqual({ label: 'Partly cloudy', iconKey: 'partly-cloudy' });
  });

  it('maps the overcast code', () => {
    expect(conditionForCode(3)).toEqual({ label: 'Overcast', iconKey: 'overcast' });
  });

  it('maps fog', () => {
    expect(conditionForCode(45).label).toBe('Fog');
  });

  it('maps rain', () => {
    expect(conditionForCode(61)).toEqual({ label: 'Light rain', iconKey: 'rain' });
  });

  it('maps rain showers', () => {
    expect(conditionForCode(80).label).toBe('Light rain showers');
  });

  it('maps thunderstorm', () => {
    expect(conditionForCode(95)).toEqual({ label: 'Thunderstorm', iconKey: 'thunderstorm' });
  });

  it('falls back to unknown for codes outside the table', () => {
    expect(conditionForCode(200)).toEqual({ label: 'Unknown', iconKey: 'unknown' });
  });
});
