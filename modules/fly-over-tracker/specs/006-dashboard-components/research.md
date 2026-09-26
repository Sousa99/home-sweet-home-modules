# Research: Dashboard Embed Components

Phase 0 output for `specs/006-dashboard-components`. Every decision is recorded with its
rationale and the alternatives considered. Clarifications were resolved with the user up front:
(1) deliverable is the two components in the existing frontend package, homesweethome
integration is out of scope; (2) widgets are self-sufficient (they fetch and refresh their own
data); (3) the closest-plane card shows clear empty/error states; (4) the map widget's list
uses the compact `AircraftMapCard`; (5) data fetching uses internal TanStack Query.

---

## Decision 1: Closest aircraft — no new endpoint, reuse the sorted result

- **Decision**: Identify the closest aircraft as the **first item** of the existing
  `FlyOverResult.aircraft` array (`aircraft[0]`), which the backend already returns sorted
  ascending by `distanceKm` (haversine from the query center).
- **Rationale**: The client never talks to the ADS-B feed directly — it queries the module's
  backend `GET /api/fly-overs`, which computes `distanceKm` and sorts ascending (spec
  requirement). The closest aircraft is therefore `aircraft[0]` with zero extra work and no
  new endpoint. This matches the user's request to "evaluate" a better adsb.lol endpoint.
- **Alternatives considered**: adsb.lol `GET /v2/point/{lat}/{lon}/{radiusNm}` was evaluated —
  it has **no** dedicated "nearest aircraft" endpoint; it returns every aircraft in the circle
  and the backend already sorts by distance. A new backend "closest" endpoint was considered
  and rejected: it would duplicate the existing pipeline for no user-visible benefit at this
  feature's scope (one card, already bounded by the radius).
- **Tie-break**: For equal `distanceKm`, the backend's stable sort keeps feed order, which is
  deterministic for the same snapshot. For extra robustness the client derives the closest
  with a deterministic tie-break by `icao24` when distances tie.

## Decision 2: Data fetching — internal TanStack Query, self-contained

- **Decision**: Widgets fetch their own data through a shared `useFlyOversQuery` hook built on
  TanStack Query (`useQuery` with `refetchInterval` for auto-refresh, `refetch` for manual
  refresh — the exact pattern already used in `App.tsx`). Each widget wraps its content in a
  **per-widget** `QueryClientProvider` backed by an isolated `QueryClient`
  (`retry: false`, `refetchOnWindowFocus: false`, matching the SPA's `main.tsx` config),
  created once per widget instance.
- **Rationale**: Reuses an existing dependency and the SPA's proven polling semantics
  (including distinguishing `isLoading` vs `isFetching`); widgets are fully self-contained
  with no host setup and no cross-instance or cross-test cache bleed.
- **Alternatives considered**:
  - Plain `useState`/`useEffect` fetch hook — no provider concerns, but duplicates the SPA's
    polling logic and loses cache/refetch semantics; rejected.
  - Requiring the host to provide a `QueryClientProvider` — couples the library to the host;
    rejected.
  - A single shared module-level `QueryClient` — dedups identical requests across widget
    instances but couples instances and risks cache bleed between tests; rejected in favor of
    per-widget isolation.

## Decision 3: Endpoint configurability — `baseUrl` prop

- **Decision**: Extend `getFlyOvers(query, baseUrl?)` with an optional base URL, defaulting to
  `''` (same-origin `/api/fly-overs`, unchanged SPA behavior). Both widgets accept a `baseUrl`
  prop and pass it through, so homesweethome can point the widgets at the module backend
  wherever it is hosted.
- **Rationale**: The SPA reaches the backend via a dev proxy on the same origin; a dashboard
  in a separate app needs a configurable target. Backward compatible: existing callers
  (`App.tsx`, client tests) keep working unchanged. `getFlyOvers` (with its `baseUrl`
  argument) is internal to the package — it is not part of the published surface, which is
  the two widgets and their types only.
- **Note (out of scope)**: Cross-origin consumption requires the module backend to allow the
  dashboard origin (CORS) or a same-origin proxy. This is a deployment concern for
  homesweethome, not part of this feature.

## Decision 4: Widget map — new read-only `AircraftMapView`

- **Decision**: Create an internal read-only map component, `AircraftMapView`, that renders the
  OSM tile layer, the radius circle, a center marker, and the aircraft markers (rotated plane
  icons + callsign tooltips via the existing `createAircraftIcon`), and fits the view to the
  configured circle on location change (reusing `circleBounds`/`clampLat`). No draggable
  selection markers — the location is configured via props, not edited in the widget.
- **Rationale**: The widget's location is fixed by configuration (per the spec), so the SPA's
  interactive selection handles (draggable center + edge markers) do not belong in the widget.
  A dedicated read-only view avoids touching the tested `FlyOverMap` contract.
- **Alternatives considered**: Reusing `FlyOverMap` with a `readOnly` prop — rejected because
  `FlyOverMap` also docks the compact card list and requires `onCenterChange`/`onRadiusChange`;
  its contract and the SPA behavior should stay unchanged.

## Decision 5: Layout — fill width, map flexes, list is natural height (scrollable)

- **Decision**: `FlyOverWidget` renders as a flex column that is `h-full w-full`: the map
  region is `flex-1 min-h-0` (fills the available vertical space), and the list beneath sits at
  its natural height with a proportional cap and internal scrolling when it exceeds the
  available space. `ClosestAircraftCard` is a `w-full` block taking only the vertical space its
  content needs.
- **Rationale**: Matches the spec requirement that both widgets "fill the available space" —
  horizontally always; the map widget's map takes the remaining vertical space while the list
  takes only what it needs; the card takes only its natural height.
- **Alternatives considered**: Fixed-height map + scrolling page — rejected (does not fill the
  available space); no scroll cap on the list — rejected (a very long list would crowd the map).

## Decision 6: Update feedback — widget-scoped top-corner indicator

- **Decision**: A small internal `UpdatingIndicator` (spinner chip labeled "Updating…") pinned
  to the widget's top-right corner (absolutely positioned within the widget), shown only while
  a background or manual refresh is in flight and there is already data to update.
- **Rationale**: The SPA's convention is a fixed viewport-corner toast; inside a dashboard
  panel, feedback should be scoped to the widget so it reads as that widget's status.
- **Alternatives considered**: Reusing the SPA's fixed `fixed right-4 top-4` toast — rejected
  for a dashboard embedding context (it would float over the whole page); inline text replacing
  content — rejected (disruptive layout shift).

## Decision 7: Closest-card transition — keyed fade/slide

- **Decision**: The closest-card's content is keyed by the closest aircraft's `icao24`. When
  the identity changes, the new card animates in with a short fade + slight vertical slide
  (~250 ms), defined as a small keyframe animation added to `src/index.css`. Rapid consecutive
  changes re-trigger cleanly without flicker (keyed remount, single enter animation).
- **Rationale**: Gives a smooth visual transition on a change (spec FR-008) with minimal
  machinery — a CSS enter animation keyed to the data identity.
- **Alternatives considered**: View-transition-style crossfade of previous/next card — more
  complex bookkeeping for the same perceived result; in-place CSS transition of opacity without
  keying — cannot detect "which" aircraft changed, so it cannot animate identity changes
  distinctly.

## Decision 8: Presentation — compact card under the map, full card for the closest plane

- **Decision**: The `FlyOverWidget` lists the aircraft beneath the map using the compact
  horizontal **`AircraftMapCard`** (plane glyph + emoji detail row), exactly matching the SPA's
  map mode. The `ClosestAircraftCard` uses the full list-view **`AircraftCard`** (callsign,
  origin/destination grid, altitude/speed/heading/distance).
- **Rationale**: User decision — the widget reproduces the SPA's map-mode experience (compact
  cards under the map), while the closest-plane widget shows the rich `AircraftCard`, matching
  the spec's "using the list cards of the SPA".
- **Alternatives considered**: Full `AircraftCard` under the map — richer but taller and not
  the SPA's map-mode look; rejected per user choice.

## Decision 9: Testing and Storybook strategy

- **Decision**: Vitest + Testing Library for both widgets, using the existing jsdom-safe
  `react-leaflet` mock (`src/test/react-leaflet-mock.tsx`) for the map and mocked `fetch` for
  the query layer; fake timers drive auto-refresh assertions. Storybook stories for both
  widgets mock `fetch` (or render against the running backend) with sample fixtures.
- **Rationale**: Consistent with the existing component test/story conventions; no network or
  real Leaflet DOM in tests; the library's export surface is asserted by extending
  `src/lib/__tests__/exports.test.ts`.
- **Note**: `getFlyOvers` gains an optional `baseUrl`; its existing client tests are extended
  to cover URL construction for both the default and a custom base URL.