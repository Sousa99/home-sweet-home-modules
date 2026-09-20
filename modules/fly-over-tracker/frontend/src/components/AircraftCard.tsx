import type { Aircraft } from '../api/types';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

function speedKmh(velocity: number | null): string {
  return velocity === null ? '—' : `${Math.round(velocity * 3.6)} km/h`;
}

function altitudeMeters(altitude: number | null): string {
  return altitude === null ? '—' : `${Math.round(altitude)} m`;
}

function headingDegrees(value: number | null): string {
  return value === null ? '—' : `${Math.round(value)}°`;
}

export interface AircraftCardProps {
  aircraft: Aircraft;
}

/**
 * A single aircraft in the fly-over result: callsign, origin, altitude, speed,
 * heading, and distance from the query center.
 */
export function AircraftCard({ aircraft }: AircraftCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{aircraft.callsign ?? aircraft.icao24}</CardTitle>
        <Badge>{aircraft.distanceKm.toFixed(1)} km</Badge>
        {aircraft.onGround && <Badge>on ground</Badge>}
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
          <dt className="text-slate-400">Origin</dt>
          <dd>{aircraft.originCountry ?? '—'}</dd>
          <dt className="text-slate-400">Altitude</dt>
          <dd>{altitudeMeters(aircraft.altitude)}</dd>
          <dt className="text-slate-400">Speed</dt>
          <dd>{speedKmh(aircraft.velocity)}</dd>
          <dt className="text-slate-400">Heading</dt>
          <dd>{headingDegrees(aircraft.trueTrack)}</dd>
        </dl>
      </CardContent>
    </Card>
  );
}
