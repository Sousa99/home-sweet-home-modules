# Quickstart — Bus Icon Favicon & Stop Card Widget Showcase (003)

**Date**: 2026-09-25

Runnable validation guide proving the component showcase, the published
package, and the bus favicon work end-to-end. Details live in
[research.md](research.md), [data-model.md](data-model.md), and
[contracts/](contracts/); this file is a run guide only.

## Prerequisites

- Node 24, pnpm 11 (`pnpm install` at repo root).
- No backend, database, or network access is required — the showcase uses
  static `fetchTimes` fixtures and the favicon is a static asset.

## 1. Run the component showcase (Storybook)

```bash
pnpm --filter ./frontend storybook          # Storybook dev on http://localhost:6006
```

1. Open **StopCard → Docs** in the sidebar. You should see, on one page:
   - prose documenting the widget's purpose, its props, and its states,
   - a readable **Controls** table listing `stopId`, `stopName`, `lines`,
     `limit`, `refetchIntervalMs`, `fetchTimes`, and `missing` (FR-004),
     **and**
   - interactive `<Canvas>` examples for **Default**, **ScheduleOnly**,
     **Empty**, **Loading**, **Error**, and **Missing** (FR-003, FR-005).
2. In the **Default** canvas, the widget shows the stop name (plus the line
   filter badge), rows with the line badge, headsign, a delay delta
   (`+4 min` / `on time`), the arrival time, and a `Live` or `Schedule` pill
   per row — matching the SPA exactly (FR-002, SC-004). It is the widget's
   own `fetchTimes` fixture that produces these rows (FR-010).
3. In the **Empty** canvas, the widget shows "No more buses scheduled today."
4. Storybook runs fully offline (FR-001) — no `/api` calls, no errors in the
   browser console.

## 2. Verify the published package

```bash
pnpm --filter ./frontend build:lib           # outputs dist-lib/
```

- `dist-lib/index.d.ts` exports `StopCard`, `StopCardProps`,
  `FetchStopTimes`, `Passing`, `RealtimeInfo`, and `StopTimesResponse`
  (FR-009, SC-006); `dist-lib/index.js` bundles the widget.
- `dist-lib/styles.css` carries the Tailwind styles consumers import via
  `@sousa99/bus-catcher-components/styles.css`.
- The SPA dashboard renders this same `StopCard` widget (single shared
  implementation — SC-004).

## 3. Verify the favicon

```bash
pnpm --filter ./frontend dev                # Vite on http://localhost:5173
```

- Open http://localhost:5173 — the browser tab shows a **bus-front icon**
  instead of the default blank page (FR-006).
- Resize/zoom the tab to a small size: the icon stays legible (FR-007).
- Toggle OS dark mode: the icon remains visible (stroke colors chosen to read
  on both themes).
- Each configured stop renders the `StopCard` widget and refreshes its
  waiting times on the interval (FR-010).

## 4. Static build of the showcase

```bash
pnpm --filter ./frontend build-storybook    # outputs dist-storybook/
```

- The build completes without type or bundling errors and the Docs pages are
  included in the static output.

## 5. Gates

```bash
pnpm lint && pnpm format && pnpm test && pnpm typecheck
node scripts/scaffold.mjs --check
```

All must pass before merge. Vitest covers the widget's fetch lifecycle
(`StopCard.test.tsx`) and the component states; the Storybook build, the
`build:lib` output, and the favicon checks above are the feature-specific
validations.

## Smoke checklist

- [ ] `storybook dev` serves **StopCard → Docs** with prose + canvases
- [ ] The Docs page shows a readable **Controls** props table
- [ ] **Default** canvas shows Live + Schedule pills per row with delay deltas
- [ ] **ScheduleOnly** / **Empty** / **Loading** / **Error** / **Missing**
      canvases render their states
- [ ] The showcased widget is the same shared `StopCard` (no copy)
- [ ] The widget fetches its own waiting times (fixtures in the showcase,
      built-in API client in the SPA)
- [ ] `build:lib` exports `StopCard` + `StopCardProps` + `FetchStopTimes` +
      `Passing` + `RealtimeInfo` + `StopTimesResponse` from
      `dist-lib/index.d.ts`
- [ ] Browser tab on the SPA shows the bus-front favicon
- [ ] Favicon remains legible at small tab sizes and in dark mode
- [ ] `build-storybook` completes with Docs included
- [ ] All quality gates pass