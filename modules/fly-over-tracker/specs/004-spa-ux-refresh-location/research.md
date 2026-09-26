# Research — SPA UX Improvements

**Feature**: specs/004-spa-ux-refresh-location | **Phase 0 output**
**Date**: 2026-09-21

All unknowns in the Technical Context were resolved by codebase inspection and established web
platform behavior; no external research dependency remains.

## 1. Geolocation: native browser API + secure-context handling

**Decision**: Use the native `navigator.geolocation.getCurrentPosition(success, error, options)`
API from the "Use my current location" control, with `enableHighAccuracy: false` and a ~10 s
timeout. On success, build a `LocationQuery` from the reported `coords.latitude` /
`coords.longitude` plus the preserved radius, and propagate it through the existing `onChange`
path so the inputs and any map selection stay consistent.

**Rationale**: No external dependency or account is needed for a "where am I" convenience; the
spec is fill-inputs-only (confirmed by the user), so the API's single-shot callback model fits
perfectly. Reusing `onChange` means the SPA's shared-draft sync (from feature 002) updates both
the inputs and the map with zero extra wiring.

**Validation**: Reuse the existing `clampLat`/`clampLng`/`isValidLat`/`isValidLng` helpers from
`frontend/src/lib/location.ts` so reported coordinates are always within the backend bounds.

**Edge handling** (maps to spec FR-005 and the edge cases):
- `PERMISSION_DENIED` → "Location permission was denied." alert; inputs unchanged.
- `POSITION_UNAVAILABLE` / `TIMEOUT` → "Unable to determine your location." alert; inputs
  unchanged.
- `!navigator.geolocation` (insecure context / unsupported) → control shows "Location is
  unavailable in this browser."; typed input remains fully usable.

**Radius preservation**: current valid field value → current shared draft radius → default
10 km (matches `DEFAULT_RADIUS_KM` in `App.tsx`).

**Testing**: jsdom has no geolocation; tests stub `navigator.geolocation` and drive the success /
denial / timeout / unsupported paths.

**Alternatives considered**:
- `watchPosition` (continuous tracking) — rejected: the spec wants a one-shot fill; continuous
  updates would fight the user's manual editing.
- Third-party geolocation wrapper — rejected: adds a dependency for a one-line browser API.

## 2. Auto-refresh and data fetching: TanStack Query

**Decision**: Introduce `@tanstack/react-query` and route the SPA's fly-over fetch through
`useQuery`. The submitted location becomes the query key (`['fly-overs', query]`); `enabled:
query !== null` gates fetching until a query is submitted; `refetchInterval: refreshRate ===
'off' ? false : refreshRate * 1000` drives automatic refresh at the selected cadence; `refetch()`
backs the manual Refresh action.

**Rationale**: This satisfies FR-008 (re-run at cadence), FR-009 (off stops refreshing), FR-010
(no overlapping refreshes — fetch deduplication is built in, and the interval is rescheduled after
each settle), and FR-011 (manual refresh) with library-provided semantics instead of a hand-rolled
`setInterval` + in-flight ref. It also replaces the manual `run`/`status`/`error`/`result` state
machine, which is the SPA's entire data layer. The dependency stays at the SPA/App level; the
publishable components remain presentational and dependency-free. Cadence is measured after each
fetch settles (TanStack default), which still satisfies SC-004. This supersedes the original
"no new dependency / `setInterval`" ruling, per the user's direction.

**Rate-limit consideration**: each refresh is a normal `/api/fly-overs` request; the backend's
bounded 429 retry (`backend/src/lib/retry.ts`) handles upstream adsb.lol throttling. A single
user polling at 5 s is well within the free feed's practical limits.

**Query defaults**: `retry: false` (matches the app's single-attempt behavior) and
`refetchOnWindowFocus: false` (refresh only at the selected cadence or on explicit action), set on
the `QueryClient` in `frontend/src/main.tsx`.

**Testing**: App tests render inside a fresh `QueryClientProvider` (per-test client, `retry:
false`). Auto-refresh tests use `vi.useFakeTimers()` + `advanceTimersByTimeAsync` with synchronous
`fireEvent` interactions (userEvent hangs under fake timers), asserting `getFlyOvers` call counts.

**Alternatives considered**:
- Hand-rolled `setInterval` + `useRef` in-flight guard — rejected by the user in favor of the
  library; TanStack also removes the manual state machine.
- `setTimeout` chaining (schedule next after each completion) — rejected: cadence would drift and
  TanStack already reschedules on settle.

## 3. Favicon: static SVG in `public/`

**Decision**: Add `frontend/public/favicon.svg` (an aircraft glyph using the existing
`PLANE_SVG_PATH` geometry from `frontend/src/lib/aircraftIcon.ts`, filled with the theme amber
`#d97706`) and reference it from `frontend/index.html` with
`<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`.

**Rationale**: Vite copies everything in `public/` verbatim to the SPA build output `dist-app/`
(and serves it at `/` in dev), so the favicon appears in the tab and bookmarks with zero build
config. SVG is resolution-independent and avoids generating multiple PNG sizes. Reusing the
existing glyph keeps the icon consistent with the map markers and aircraft cards (per the user's
choice). The library build (`dist-lib`) and Storybook are unaffected.

**Testing**: assert the `<link rel="icon">` exists in `index.html` (or rely on the SPA build
emitting `dist-app/favicon.svg`); manual check in the browser tab.

**Alternatives considered**:
- PNG favicon at multiple sizes — rejected: extra assets and tooling for no benefit on modern
  browsers.
- Inline data-URI favicon — rejected: less maintainable than a static asset.
- Library-exported React favicon — rejected: a favicon is a static document resource, not a
  component.

## 4. Centered selection panel

**Decision**: In `App.tsx`, change the controls wrapper from
`flex flex-wrap items-start justify-between` to a centered single column —
`flex flex-col items-center gap-4` — and give `FlyOverForm` a bounded width
(`w-full max-w-md`) so the form and the `ViewModeToggle` share a centered axis. The result area
below keeps its existing container (`max-w-2xl` / `max-w-5xl` in map mode).

**Rationale**: Pure layout change (FR-001) with no behavioral impact; the form and toggle are
already stacked vertically, and the existing toggle is an `inline-flex` pill that centers
naturally.

**Testing**: assert the wrapper classes / structure in `App.test.tsx` (list and map modes).

**Alternatives considered**:
- Flexbox `justify-center` on the existing row — rejected: it would center the two items as a
  pair but not align the form and toggle to the same center axis when wrapped.
- Grid — rejected: no benefit over a simple flex column for two stacked controls.

## 5. Component-library exposure

**Decision**: The new `RefreshRateSelect` is added under `frontend/src/components/` and exported
from `components/index.ts` (with its `RefreshRate` type), plus a Storybook story — consistent
with the module's components-first convention (feature 001, 002). `FlyOverForm` keeps its public
props unchanged (the geolocation control is internal); its story is updated to demo the control.

**Rationale**: Keeps the publishable components library (`.`, `./styles.css` exports) and the SPA
in sync with minimal new API surface.

## Consolidated decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Native geolocation, fill-inputs-only, radius preserved, secure-context guard | no dependency; matches user choice; reuses existing draft sync |
| 2 | TanStack Query for the SPA fetch; `refetchInterval` for cadence, `enabled` gate, `refetch` for manual | native polling + overlap guard; removes the manual state machine |
| 3 | Static SVG favicon in `public/` using existing glyph | zero build config; consistent brand |
| 4 | Centered flex column for selection panel | minimal layout change, no behavior impact |
| 5 | New `RefreshRateSelect` component exported + story | components-first convention |