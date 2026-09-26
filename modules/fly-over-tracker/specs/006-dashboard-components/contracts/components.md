# Contract: Public Component API — Dashboard Embed Components

**Interface**: `@sousa99/fly-over-tracker-components` (published React component library)

This feature adds two exported components. The published package surface of
`@sousa99/fly-over-tracker-components` is exactly these two widgets plus the types their
props reference; the SPA components, the UI primitives, and the API client are internal
implementation details and are not exported. Types are derived from the existing
`LocationQuery` / `Aircraft` / `FlyOverResult` types and the existing `RefreshRate` type.

## Exported Components

### FlyOverWidget

A self-sufficient map + list widget: a read-only map centered on the configured location
(radius circle, aircraft markers) with the aircraft listed beneath it using the compact
`AircraftMapCard`. Fills the available width; the map fills the available vertical space; the
list takes its natural height and scrolls when it exceeds the available space.

```ts
interface FlyOverWidgetProps {
  /** The location and radius to watch (a valid LocationQuery). */
  location: LocationQuery;
  /** Auto-refresh cadence in seconds; 'off' disables automatic refresh. Default 'off'. */
  autoRefresh?: RefreshRate;
  /** Base URL of the module backend; '' (default) = same-origin `/api`. */
  baseUrl?: string;
  /** Extra classes applied to the widget root. */
  className?: string;
}
```

**Behavior**:
- Fetches `GET {baseUrl}/api/fly-overs?lat=..&lng=..&radiusKm=..` and renders the result.
- Re-fetches on `location`, `baseUrl`, or cadence change; refreshes automatically at the
  configured cadence.
- States: `loading` hint → `success` (map + list) / empty state (no aircraft) / `error` state
  (feed unavailable — never stale data as fresh).
- Shows a top-corner `Updating…` indicator while a background/manual refresh is in flight.

### ClosestAircraftCard

A compact card showing the single nearest aircraft within the configured radius, rendered with
the full `AircraftCard` presentation. Fills the available width; takes only its natural height.

```ts
interface ClosestAircraftCardProps {
  /** The location and radius to watch (a valid LocationQuery). */
  location: LocationQuery;
  /** Auto-refresh cadence in seconds; 'off' disables automatic refresh. Default 'off'. */
  autoRefresh?: RefreshRate;
  /** Base URL of the module backend; '' (default) = same-origin `/api`. */
  baseUrl?: string;
  /** Extra classes applied to the card root. */
  className?: string;
}
```

**Behavior**:
- Fetches the same fly-over result and displays the closest aircraft — the minimum
  `distanceKm`, ties broken deterministically by `icao24`.
- When the closest aircraft changes, the card transitions smoothly (fade + slight slide,
  ~250 ms) — never an abrupt replacement.
- States: `loading` hint → `success` (card) / empty state (no aircraft in range) / `error`
  state (feed unavailable — never stale data as fresh).
- Shows a top-corner `Updating…` indicator while a background/manual refresh is in flight.

## Internal Client Extension (not published)

### getFlyOvers

Backward-compatible extension of the internal client function, used by the widgets.

```ts
function getFlyOvers(query: LocationQuery, baseUrl?: string): Promise<FlyOverResult>;
```

- `baseUrl` defaults to `''` → requests same-origin `/api/fly-overs` (unchanged SPA behavior).
- When provided, requests `{baseUrl}/api/fly-overs?...`.
- Throws `ApiError` on non-OK responses, as today.
- Not part of the published surface: `getFlyOvers`, `ApiError`, and `MAX_RADIUS_KM` are
  internal to the package.

## Dependency & Setup Notes

- Both widgets render their content inside a library-owned `QueryClientProvider` with an
  isolated per-instance `QueryClient` (`retry: false`, `refetchOnWindowFocus: false`), so the
  host does not need to provide TanStack Query setup and widget instances share no cache state.
- Peer dependencies required by the host, unchanged: `react`, `react-dom`, `leaflet`,
  `react-leaflet`.
- Cross-origin consumption requires the module backend to allow the dashboard origin (CORS)
  or a same-origin proxy — a deployment concern, not part of this contract.
- New exports are asserted by `src/lib/__tests__/exports.test.ts`.