import type { JSX } from 'react';
import { PLANE_SVG_PATH, normalizeDegrees } from '../lib/aircraftIcon';
import { cn } from '../lib/utils';

export interface PlaneGlyphProps {
  /** The aircraft's track angle in degrees; the plane glyph rotates to match. */
  trueTrack?: number | null;
  className?: string;
}

/**
 * A small airplane glyph rotated to an aircraft's heading, used alongside text
 * in the aircraft cards (the map marker uses the same path via a Leaflet div
 * icon).
 */
export const PlaneGlyph = ({ trueTrack = 0, className }: PlaneGlyphProps): JSX.Element => {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block text-slate-800', className)}
      style={{ transform: `rotate(${normalizeDegrees(trueTrack ?? 0)}deg)` }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
        <path fill="currentColor" stroke="#ffffff" strokeWidth="1" d={PLANE_SVG_PATH} />
      </svg>
    </span>
  );
};
