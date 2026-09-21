/**
 * Static ICAO airport code → country mapping.
 *
 * OpenSky's flight data identifies destinations by ICAO airport code only;
 * this bundled, in-repo dataset derives the country. It is a deliberately
 * maintained, representative subset of major airports (not exhaustive) —
 * unknown codes map to `null` and are shown as such.
 */

export const ICAO_TO_COUNTRY: Record<string, string> = {
  // Europe
  EDDF: 'Germany',
  EDDM: 'Germany',
  EDDC: 'Germany',
  EDDT: 'Germany',
  EGLL: 'United Kingdom',
  EGKK: 'United Kingdom',
  EGLC: 'United Kingdom',
  LFPG: 'France',
  LFPO: 'France',
  LFLL: 'France',
  LFMN: 'France',
  EHAM: 'Netherlands',
  EBBR: 'Belgium',
  LSZH: 'Switzerland',
  LSGG: 'Switzerland',
  LEMD: 'Spain',
  LEBL: 'Spain',
  LIRF: 'Italy',
  LIMC: 'Italy',
  LPPT: 'Portugal',
  LROP: 'Romania',
  EKCH: 'Denmark',
  ESSA: 'Sweden',
  ENGM: 'Norway',
  EFHK: 'Finland',
  EPWA: 'Poland',
  LKPR: 'Czech Republic',
  LOWW: 'Austria',
  LHBP: 'Hungary',
  LYBE: 'Serbia',
  LGAV: 'Greece',
  UUEE: 'Russia',
  UUWW: 'Russia',
  UKBB: 'Ukraine',
  // North America
  KLAX: 'United States',
  KJFK: 'United States',
  KORD: 'United States',
  KSFO: 'United States',
  KSEA: 'United States',
  KDFW: 'United States',
  KATL: 'United States',
  KDEN: 'United States',
  CYYZ: 'Canada',
  CYVR: 'Canada',
  MMUN: 'Mexico',
  MMMX: 'Mexico',
  // South America
  SBGR: 'Brazil',
  SAEZ: 'Argentina',
  SCEL: 'Chile',
  SKBO: 'Colombia',
  // Asia & Oceania
  RJTT: 'Japan',
  RJBB: 'Japan',
  RKSI: 'South Korea',
  VHHH: 'Hong Kong',
  ZSPD: 'China',
  ZBAA: 'China',
  WSSS: 'Singapore',
  VTBS: 'Thailand',
  WIII: 'Indonesia',
  OMDB: 'United Arab Emirates',
  OTHH: 'Qatar',
  VIDP: 'India',
  VABB: 'India',
  YSSY: 'Australia',
  YMML: 'Australia',
  NZAA: 'New Zealand',
  // Africa
  FAOR: 'South Africa',
  HECA: 'Egypt',
  DNMM: 'Nigeria',
  HKJK: 'Kenya',
};

/**
 * Resolve the country for an ICAO airport code.
 *
 * @param icao - the ICAO code, or `null`
 * @returns the country name, or `null` when unknown
 */
export function countryForIcao(icao: string | null): string | null {
  if (icao === null) return null;
  const country = ICAO_TO_COUNTRY[icao.toUpperCase()];
  return country ?? null;
}
