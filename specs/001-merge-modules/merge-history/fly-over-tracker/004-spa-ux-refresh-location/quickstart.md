# Quickstart — SPA UX Improvements

**Feature**: specs/004-spa-ux-refresh-location | **Phase 1 output**
**Purpose**: Runnable validation guide proving the feature works end-to-end. Reference the
[spec](./spec.md), [contracts](./contracts/fly-over-form.md), and
[contracts](./contracts/refresh-rate-select.md) for the acceptance details.

## Prerequisites

- pnpm 11, Node ≥ 24 installed; dependencies installed (`pnpm install` at the repo root).
- Optional: the `mock` feed avoids adsb.lol rate limits and network variability —
  set `FEED=mock` when starting the backend.

## 1. Run the stack

```sh
# terminal 1 — backend on :3000 (mock feed)
FEED=mock pnpm dev

# terminal 2 — frontend dev server on :5173 (proxies /api to :3000)
pnpm dev:web
```

Open http://localhost:5173 in a modern browser. **localhost is a secure context**, so geolocation
is available in development. For a deployed (HTTPS) check, serve the built SPA:
`pnpm --filter ./frontend build` (emits `dist-app/`) and serve it over HTTPS.

## 2. Validate — centered selection panel (FR-001, SC-001)

1. In **list** mode, confirm the coordinate form and the List/Map toggle form a single
   horizontally centered column above the results.
2. Switch to **map** mode and confirm the panel stays centered and the map renders below.

## 3. Validate — current location (FR-002–FR-006, SC-002/SC-003)

1. In the form, click **"Use my current location"**.
2. Allow the permission prompt. Within ~1 second the latitude/longitude inputs are filled with
   your device position and the radius is unchanged. The map marker (map mode) moves to match.
3. Press **Find aircraft** — the query runs against exactly those coordinates.
4. Deny permission (or reload with a blocked permission) and click the control again — a clear
   inline message appears and the inputs do **not** change.
5. On an insecure context (http:// over a non-localhost host) the control reports that location
   is unavailable instead of prompting.

## 4. Validate — auto-refresh (FR-007–FR-011, SC-004/SC-005)

1. Submit a query so a result is shown.
2. Set the auto-refresh selector to **10 seconds**. In the browser Network tab, observe a new
   `/api/fly-overs` request every ~10 s and the results (as-of / aircraft) updating without
   interaction.
3. Try **5, 30, and 60 seconds** — the cadence adjusts to each selection immediately.
4. Set it to **off** — no further automatic requests (watch for 10 s).
5. While auto-refresh is active, press the manual **Refresh** — a request fires immediately and
   the schedule continues (no overlap).
6. Before any query is submitted, a non-off rate produces no requests until you submit.

## 5. Validate — favicon (FR-012, SC-006)

1. In the browser tab, confirm the aircraft favicon (amber plane) appears next to the
   "fly-over-tracker" title, and that the icon also shows when bookmarking the page.
2. Confirm the built SPA includes it: `ls frontend/dist-app/favicon.svg` after a build.

## 6. Automated quality gates

```sh
pnpm lint          # ESLint
pnpm format        # Prettier check
pnpm test          # Vitest (frontend + backend)
pnpm typecheck     # tsc --noEmit (all packages)
node scripts/scaffold.mjs --check   # generated-file drift check
```

All must pass before merge. Frontend tests cover: geolocation success/denial/timeout/unsupported
(`FlyOverForm.test.tsx`), auto-refresh cadence/off/no-overlap with fake timers (`App.test.tsx`),
the centered panel layout (`App.test.tsx`), and the rate selector options (`RefreshRateSelect`).
Storybook demos the new `RefreshRateSelect` and the updated `FlyOverForm`:
`pnpm storybook`.