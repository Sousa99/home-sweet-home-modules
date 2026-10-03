import type { Aircraft } from '../api/types';

/**
 * Deterministically select the closest aircraft to the configured location:
 * the minimum `distanceKm`, with a lexicographic `icao24` tie-break so the
 * selection is stable regardless of result ordering.
 */
export function selectClosest(aircraft: Aircraft[]): Aircraft | null {
  if (aircraft.length === 0) return null;
  return aircraft.reduce<Aircraft>((closest, candidate) => {
    if (candidate.distanceKm < closest.distanceKm) return candidate;
    if (candidate.distanceKm === closest.distanceKm && candidate.icao24 < closest.icao24) {
      return candidate;
    }
    return closest;
  }, aircraft[0]!);
}
