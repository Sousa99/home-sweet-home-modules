import L from 'leaflet';

/**
 * Configure Leaflet's default marker icons with explicit, bundle-safe URLs.
 *
 * Bundlers do not resolve Leaflet's default `iconUrl` at build time, which
 * produces the well-known "missing marker" symptom. The URLs below point at the
 * leaflet package on a CDN, so both the SPA and library consumers get working
 * markers without bundling the PNG assets. Safe to call multiple times.
 */
let configured = false;

export function configureDefaultMarkerIcons(): void {
  if (configured) return;
  configured = true;
  delete (L.Icon.Default as { prototype?: { _getIconUrl?: unknown } }).prototype?._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}
