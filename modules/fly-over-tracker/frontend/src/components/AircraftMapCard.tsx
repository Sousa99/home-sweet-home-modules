import type { JSX } from 'react';
import type { Aircraft } from '../api/types';
import { altitudeMeters, headingDegrees, speedKmh } from './AircraftCard';
import { Card } from './ui/card';
import { PlaneGlyph } from './PlaneGlyph';

export interface AircraftMapCardProps {
  aircraft: Aircraft;
}

/** Emoji glyph for a flight detail field. */
function detail(emoji: string, value: string): JSX.Element {
  return (
    <span className="flex items-center gap-1">
      <span aria-hidden="true">{emoji}</span>
      {value}
    </span>
  );
}

/**
 * A horizontal, always-visible flight card for the map panel: plane glyph,
 * callsign, and a row of emoji-tagged fields (origin, destination, altitude,
 * speed, heading, distance). Destination shows '—' until a lookup source
 * provides it.
 */
export const AircraftMapCard = ({ aircraft }: AircraftMapCardProps): JSX.Element => {
  const destination = aircraft.destinationCountry ?? aircraft.destinationAirport ?? '—';
  return (
    <Card className="flex flex-row items-center gap-4 px-4 py-2">
      <PlaneGlyph trueTrack={aircraft.trueTrack} className="shrink-0" />
      <p className="min-w-0 shrink-0 truncate font-semibold text-slate-800">
        {aircraft.callsign ?? aircraft.icao24}
      </p>
      <div className="flex flex-1 flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-600">
        {detail('🌍', aircraft.originCountry ?? '—')}
        {detail('🛬', destination)}
        {detail('📏', altitudeMeters(aircraft.altitude))}
        {detail('💨', speedKmh(aircraft.velocity))}
        {detail('🧭', headingDegrees(aircraft.trueTrack))}
        {detail('📍', `${aircraft.distanceKm.toFixed(1)} km`)}
      </div>
      {aircraft.onGround && (
        <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
          on ground
        </span>
      )}
    </Card>
  );
};
