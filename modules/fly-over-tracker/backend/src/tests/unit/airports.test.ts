import { describe, expect, it } from 'vitest';
import { countryForIcao, ICAO_TO_COUNTRY } from '../../lib/airports';

describe('countryForIcao', () => {
  it('resolves a known ICAO code to its country', () => {
    expect(countryForIcao('EDDF')).toBe('Germany');
    expect(countryForIcao('KSFO')).toBe('United States');
  });

  it('is case-insensitive', () => {
    expect(countryForIcao('eddf')).toBe('Germany');
  });

  it('returns null for unknown codes and null input', () => {
    expect(countryForIcao('ZZZZ')).toBeNull();
    expect(countryForIcao(null)).toBeNull();
  });

  it('covers the mock fixture destinations', () => {
    for (const icao of ['EDDF', 'LFPG', 'EGLL', 'KSFO', 'EHAM']) {
      expect(ICAO_TO_COUNTRY[icao]).toBeTruthy();
    }
  });
});
