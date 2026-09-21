import { describe, expect, it } from 'vitest';
import { ISO2_TO_COUNTRY, countryForIso2 } from '../../lib/countries';

describe('countryForIso2', () => {
  it('maps common country codes to display names', () => {
    expect(countryForIso2('PT')).toBe('Portugal');
    expect(countryForIso2('DE')).toBe('Germany');
    expect(countryForIso2('FR')).toBe('France');
    expect(countryForIso2('GB')).toBe('United Kingdom');
    expect(countryForIso2('US')).toBe('United States');
  });

  it('is case-insensitive', () => {
    expect(countryForIso2('pt')).toBe('Portugal');
  });

  it('returns null for unknown or null codes', () => {
    expect(countryForIso2(null)).toBeNull();
    expect(countryForIso2('ZZ')).toBeNull();
  });

  it('covers the full ISO 3166-1 alpha-2 set', () => {
    expect(Object.keys(ISO2_TO_COUNTRY).length).toBe(249);
  });
});
