# Quickstart: Map View & Selection

Validation guide for `specs/002-map-view-selection`. These scenarios prove the feature works
end-to-end. Component APIs are documented in [`contracts/`](./contracts/), and the state model in
[`data-model.md`](./data-model.md).

## Prerequisites

- Repo deps installed: `pnpm install` (adds `leaflet`, `react-leaflet@5`, `@types/leaflet`)
- Backend running (needed for real queries): see the module's `README.md`/`setup.md` for how to
  run the backend (`--http`, default port 3000) and the SPA dev server (default port 5173, proxy
  `/api` → 3000).
- No API key required (free OpenStreetMap tiles).

## Automated checks

```sh
pnpm lint && pnpm format && pnpm test && pnpm typecheck && node scripts/scaffold.mjs --check
```

Expected: all pass. `pnpm test` covers the new/updated component tests (mocked map) and the pure
`lib/location.ts` geometry tests.

## Manual validation (SPA, `pnpm dev` in `frontend`)

### 1. List → Map switch preserves results

1. Open the app; type a location (e.g., lat `48.8566`, lng `2.3522`, radius `50`) and press
   **Find aircraft**.
2. Switch the view toggle to **Map**.
3. **Expect**: the map shows the aircraft from the same result at their positions, the center
   marker, and the radius circle; the list view is not lost and re-appears if you toggle back —
   no new query runs on toggle.

### 2. Map selection → inputs sync

1. In **Map** mode, drag the center marker to a new spot.
2. **Expect**: the Latitude and Longitude inputs update within 1 second.
3. Drag the edge marker outward/inward.
4. **Expect**: the Radius (km) input updates within 1 second, and the circle resizes.

### 3. Inputs → map sync

1. In **Map** mode, type new values into Latitude/Longitude/Radius.
2. **Expect**: the center marker and radius circle reposition to match, without touching the map.

### 4. Pan/zoom never change the selection

1. With a location selected, pan and zoom the map extensively.
2. **Expect**: the center marker, circle, input values, and displayed result all remain unchanged;
   no new query is triggered.

### 5. Explicit submit and parity

1. Select a location via the map, then press **Find aircraft**.
2. Enter the same lat/lng/radius via the typed inputs in a second query.
3. **Expect**: identical aircraft results (same `asOf`, `count`, and aircraft set) — the query
   always runs from one shared `LocationQuery` value (see `data-model.md`).

### 6. Fallback when the map is unavailable

1. Simulate a map load failure (e.g., block the tile/script source).
2. **Expect**: a clear message is shown and the app remains fully usable in list mode with typed
   input.

## Component checks (Storybook, `pnpm storybook` in `frontend`)

- `ViewModeToggle` — renders both options; active option highlighted.
- `FlyOverMap` — renders with sample aircraft; drag center/edge markers; confirm pan/zoom leaves
  markers untouched.

## Contract references

- [view-mode-toggle.md](./contracts/view-mode-toggle.md)
- [fly-over-map.md](./contracts/fly-over-map.md)
- [fly-over-form.md](./contracts/fly-over-form.md)