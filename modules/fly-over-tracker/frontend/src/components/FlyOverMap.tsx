import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import { Circle, MapContainer, Marker, TileLayer, Tooltip } from 'react-leaflet';
import type { Marker as LeafletMarker } from 'leaflet';
import type { LeafletEvent } from 'leaflet';
import type { Aircraft, Center } from '../api/types';
import { AircraftMapCard } from './AircraftMapCard';
import { createAircraftIcon } from '../lib/aircraftIcon';
import { configureDefaultMarkerIcons } from '../lib/leaflet';
import {
  bearingDegFromCenterTo,
  clampLat,
  clampLng,
  clampRadiusKm,
  destPoint,
  radiusKmFromCenterAndEdge,
} from '../lib/location';

export interface FlyOverMapProps {
  /** The selected center point, rendered as the draggable center marker. */
  center: Center;
  /** The selected radius in kilometers; renders the circle and edge marker. */
  radiusKm: number;
  /** Aircraft from the current result, rendered as read-only markers. */
  aircraft?: Aircraft[];
  /** Called with the new center when the center marker is dragged. */
  onCenterChange: (center: Center) => void;
  /** Called with the recomputed radius when the edge marker is dragged. */
  onRadiusChange: (radiusKm: number) => void;
}

/**
 * Interactive map for the fly-over query and results: the selected center and
 * radius (draggable center + edge markers) and the current aircraft at their
 * reported positions, each with a rotated plane icon and callsign label. An
 * always-visible horizontal card per aircraft is docked below the map. Panning
 * and zooming never change the selection.
 */
export const FlyOverMap = ({
  center,
  radiusKm,
  aircraft = [],
  onCenterChange,
  onRadiusChange,
}: FlyOverMapProps): JSX.Element => {
  // Bearing from center to the edge marker keeps the handle where the user
  // dragged it while radius/center still follow the shared draft exactly.
  const [bearingDeg, setBearingDeg] = useState(0);
  const edge = destPoint(center, radiusKm, bearingDeg);

  useEffect(() => {
    configureDefaultMarkerIcons();
  }, []);

  const handleCenterDragEnd = (event: LeafletEvent) => {
    const latLng = (event.target as LeafletMarker).getLatLng();
    onCenterChange({ lat: clampLat(latLng.lat), lng: clampLng(latLng.lng) });
  };

  const handleEdgeDragEnd = (event: LeafletEvent) => {
    const latLng = (event.target as LeafletMarker).getLatLng();
    const next = { lat: clampLat(latLng.lat), lng: clampLng(latLng.lng) };
    setBearingDeg(bearingDegFromCenterTo(center, next));
    onRadiusChange(clampRadiusKm(radiusKmFromCenterAndEdge(center, next)));
  };

  return (
    <div className="space-y-3">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={10}
        scrollWheelZoom
        className="h-[420px] w-full overflow-hidden rounded-xl border border-primary/20 shadow-sm"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Circle
          center={[center.lat, center.lng]}
          radius={radiusKm * 1000}
          pathOptions={{ color: '#d97706', weight: 2 }}
        />
        <Marker
          position={[center.lat, center.lng]}
          draggable
          eventHandlers={{ dragend: handleCenterDragEnd }}
        />
        <Marker
          position={[edge.lat, edge.lng]}
          draggable
          eventHandlers={{ dragend: handleEdgeDragEnd }}
        />
        {aircraft.map((aircraftItem) => (
          <Marker
            key={aircraftItem.icao24}
            position={[aircraftItem.latitude, aircraftItem.longitude]}
            icon={createAircraftIcon(aircraftItem.trueTrack)}
          >
            <Tooltip permanent direction="top" offset={[0, -12]}>
              {aircraftItem.callsign ?? aircraftItem.icao24}
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>
      {aircraft.length > 0 && (
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {aircraft.map((aircraftItem) => (
            <AircraftMapCard key={aircraftItem.icao24} aircraft={aircraftItem} />
          ))}
        </div>
      )}
    </div>
  );
};
