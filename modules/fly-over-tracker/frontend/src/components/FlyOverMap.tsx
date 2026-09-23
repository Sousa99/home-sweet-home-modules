import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';
import { Circle, MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { Marker as LeafletMarker } from 'leaflet';
import type { LeafletEvent } from 'leaflet';
import type { Aircraft, Center, LocationQuery } from '../api/types';
import { AircraftMapCard } from './AircraftMapCard';
import { createAircraftIcon } from '../lib/aircraftIcon';
import { configureDefaultMarkerIcons } from '../lib/leaflet';
import {
  bearingDegFromCenterTo,
  circleBounds,
  clampLat,
  clampLng,
  clampRadiusKm,
  destPoint,
  radiusKmFromCenterAndEdge,
} from '../lib/location';

/** Fraction of the circle bounding box added as margin on each side of the fit. */
const FIT_PADDING_RATIO = 0.01;
/** Maximum zoom the fit will request; matches the OSM tile layer ceiling (z19). */
const FIT_MAX_ZOOM = 19;

/**
 * Moves the map view to the submitted selection: centered on the request and
 * zoomed so the selection circle fills most of the frame. Fits once per new
 * `fitRequest` (on mount when one is pending, or when the request changes);
 * never fits for draft edits, pan/zoom, or refreshes of the same request.
 * Reports each applied fit through `onFitApplied` so the owner can stop
 * treating the request as pending (e.g. across a map remount).
 */
function MapFitController({
  fitRequest,
  onFitApplied,
}: {
  fitRequest?: LocationQuery | null;
  onFitApplied?: (query: LocationQuery) => void;
}) {
  const map = useMap();
  const fitted = useRef<LocationQuery | null>(null);

  useEffect(() => {
    if (!fitRequest || fitted.current === fitRequest) return;
    fitted.current = fitRequest;

    const box = circleBounds({ lat: fitRequest.lat, lng: fitRequest.lng }, fitRequest.radiusKm);
    const dLat = (box.northeast.lat - box.southwest.lat) * FIT_PADDING_RATIO;
    const dLng = (box.northeast.lng - box.southwest.lng) * FIT_PADDING_RATIO;
    const corners: [[number, number], [number, number]] = [
      [clampLat(box.southwest.lat - dLat), box.southwest.lng - dLng],
      [clampLat(box.northeast.lat + dLat), box.northeast.lng + dLng],
    ];
    map.flyToBounds(corners, { maxZoom: FIT_MAX_ZOOM });
    onFitApplied?.(fitRequest);
  }, [fitRequest, map, onFitApplied]);

  return null;
}

export interface FlyOverMapProps {
  /** The selected center point, rendered as the draggable center marker. */
  center: Center;
  /** The selected radius in kilometers; renders the circle and edge marker. */
  radiusKm: number;
  /** Aircraft from the current result, rendered as read-only markers. */
  aircraft?: Aircraft[];
  /**
   * The submitted selection to fit the view to. When present on mount, or when
   * it changes, the map animates to center on it with the circle filling most
   * of the frame. Unchanged requests never refit the view.
   */
  fitRequest?: LocationQuery | null;
  /** Called with the fitted request after the map view has moved to it. */
  onFitApplied?: (query: LocationQuery) => void;
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
  fitRequest = null,
  onFitApplied,
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
        maxZoom={19}
        scrollWheelZoom
        className="h-[420px] w-full overflow-hidden rounded-xl border border-primary/20 shadow-sm"
      >
        <MapFitController fitRequest={fitRequest} onFitApplied={onFitApplied} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
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
