import L from 'leaflet';

/** Normalize an angle in degrees to the range [0, 360). */
export function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

/** The airplane path, shared by the marker div icon and the map card glyph. */
export const PLANE_SVG_PATH =
  'M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z';

/**
 * The inline SVG airplane used for aircraft markers on the map, rotated to
 * match an aircraft's `trueTrack`. The plane's nose points "up" in the icon;
 * rotating the SVG by the track angle makes the heading visible at a glance.
 *
 * @param trueTrack - the aircraft's track angle in degrees (0-360)
 * @returns an SVG string with the plane rotated by `trueTrack`
 */
export function planeSvg(trueTrack: number): string {
  const normalized = normalizeDegrees(trueTrack);
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"
         style="transform: rotate(${normalized}deg)">
      <path fill="#0f172a" stroke="#ffffff" stroke-width="1" d="${PLANE_SVG_PATH}"/>
    </svg>`;
}

/**
 * Create the {@link L.DivIcon} used for aircraft markers on the map.
 *
 * @param trueTrack - the aircraft's track angle in degrees; the plane icon is
 *   rotated to show its heading. Defaults to 0 when unknown.
 * @returns a Leaflet div icon rendering the plane SVG
 */
export function createAircraftIcon(trueTrack: number | null = 0): L.DivIcon {
  return L.divIcon({
    className: 'fly-over-aircraft-icon',
    html: planeSvg(trueTrack ?? 0),
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}
