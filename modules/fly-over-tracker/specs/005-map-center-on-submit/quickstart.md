# Quickstart — Center Map on Selection Submit

**Feature**: specs/005-map-center-on-submit | **Phase 1 output**
**Purpose**: Runnable validation guide proving the feature works end-to-end. Reference the
[spec](./spec.md) and [contracts](./contracts/fly-over-map.md) for the acceptance details.

## Prerequisites

- pnpm 11, Node ≥ 24 installed; dependencies installed (`pnpm install` at the repo root).
- Optional: the `mock` feed avoids adsb.lol rate limits and network variability — set `FEED=mock`
  when starting the backend.

## 1. Run the stack

```sh
# terminal 1 — backend on :3000 (mock feed)
FEED=mock pnpm dev

# terminal 2 — frontend dev server on :5173 (proxies /api to :3000)
pnpm dev:web
```

Open http://localhost:5173 in a modern browser.

## 2. Validate — fit on submit in map mode (FR-001/FR-002, SC-001)

1. Switch to **map** mode.
2. Type (or drag on the map) a center and radius, then press **Find aircraft**.
3. Observe the map **animate** so the submitted location is centered in the frame and the radius
   circle fills most of the frame — the full circle visible with a small margin.
4. Press **Find aircraft** again with a different center/radius — the map refits to the new
   selection each time.

## 3. Validate — pending fit from list mode (FR-003/FR-004, SC-002)

1. Switch to **list** mode and submit a new selection there.
2. Switch to **map** mode — the map fits that just-submitted selection (centered, circle filling
   the frame), instead of showing the old default view.
3. Switch back to **list** and to **map** again **without a new submit** — the view stays where
   the fit left it and does not refit.

## 4. Validate — no view jumps on edit/navigation (FR-005, SC-004)

1. In map mode, after a fit, drag the center marker or the radius handle — the map **does not**
   move (only the selection changes).
2. Pan and zoom the map freely — the view stays where you put it.
3. Edit the coordinate/radius inputs — the circle updates but the view does not jump.
4. Trigger a manual Refresh or, with auto-refresh on, wait for a refresh — the view is unchanged
   (the fit applies to the submitted selection, not refreshes).

## 5. Validate — radius extremes (FR-006, SC-003)

1. Submit a very small radius (e.g., 0.1 km) — the map zooms in but stops at the maximum useful
   zoom; the circle stays centered and visible.
2. Submit the largest radius (463 km) — the map zooms out enough that the full circle fits within
   the frame.

## 6. Validate — map failure fallback (FR-007, SC-005)

1. Break map loading (e.g., block the tile layer or simulate a map error) — the app shows the
   existing message and falls back to the list view; no fit is attempted.

## 7. Automated quality gates

```sh
pnpm lint          # ESLint
pnpm format        # Prettier check
pnpm test          # Vitest (frontend + backend)
pnpm typecheck     # tsc --noEmit (all packages)
node scripts/scaffold.mjs --check   # generated-file drift check
```

All must pass before merge. Frontend tests cover: `circleBounds` geometry (`location.test.ts`),
fit-on-mount / refit-on-change / no-fit-on-edit-and-navigation (`FlyOverMap.test.tsx`), and the
submit-in-map vs submit-in-list-then-switch scenarios (`App.test.tsx`). Storybook demos the fit:
`pnpm storybook` → FlyOver/FlyOverMap → FitOnSubmit.