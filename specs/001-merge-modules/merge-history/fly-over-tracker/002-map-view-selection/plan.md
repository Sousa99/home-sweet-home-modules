# Implementation Plan: Map View & Selection

**Branch**: `feature/002-map-view-selection` | **Date**: 2026-09-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-map-view-selection/spec.md`

## Summary

Frontend-only expansion of the fly-over SPA: the user can view fly-over results in two display
modes — the existing **list** of aircraft cards or an interactive **map** showing the aircraft
at their reported positions over the queried area. The map is also a full location-selection
input: a draggable center marker sets the latitude/longitude and a draggable edge marker resizes
the radius circle (radius = great-circle distance from the center). A single shared location
draft lives in `App`; the typed inputs and the map render from and write to the same value, so
both input formats stay consistent in both directions. Panning and zooming the map never change
the selection. Queries still run only on the explicit "Find aircraft" submit, reusing the
existing backend unchanged.

## Technical Context

**Language/Version**: TypeScript (ESM, strict), React 19, Vite 6, Tailwind CSS v4

**Primary Dependencies**:
- Frontend: existing `react@19`, `vite`, `tailwindcss@4`, `vitest`, Storybook — **new deps**:
  `leaflet`, `react-leaflet@5` (React 19 compatible, keyless, OSM tiles), `@types/leaflet` (dev)
- Backend: unchanged — no new dependencies

**Storage**: None — selection and view mode are component state lifted to `App`; no persistence.

**Testing**: Vitest + Testing Library. jsdom cannot host a real Leaflet map, so `react-leaflet`
and `leaflet` are mocked in component tests; the pure location helpers (`lib/location.ts`) are
unit-tested directly; Storybook provides manual map validation.

**Target Platform**: Modern browser SPA; the same components ship in the publishable components
library (`vite.lib.config.ts`).

**Project Type**: Web application (frontend package of the two-package monorepo)

**Performance Goals**: A map selection appears in the inputs within 1 second (SC-002); marker
dragging updates inputs smoothly (per event, not per pixel); no measurable regression in the
existing typed flow.

**Constraints**: Leaflet's default marker icons must be configured with explicit URLs under a
bundler; `leaflet/dist/leaflet.css` must be imported; real map interaction cannot run in jsdom
tests; the library build must keep bundling CSS.

**Scale/Scope**: One new view mode + map selection, ~4 new/updated components; no backend
changes, no new API surface.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The `.specify/memory/constitution.md` file is the unfilled template (no ratified principles or
gates). The module's governing docs (`setup.md`, `docs/clarify.md`, `AGENTS.md`) require:
- Single frontend package — SPA + Storybook + components library share one source ✅
- Quality gates: `pnpm lint`, `pnpm format`, `pnpm test`, `pnpm typecheck`,
  `node scripts/scaffold.mjs --check` pass before merge ✅
- Living documentation — JSDoc and docs updated in the same change as the code ✅
- Components-first build: new components are exported from the library entry and demoed in
  Storybook, consistent with the module's package organization ✅

**No violations.** Complexity is deliberately low: no storage, no new backend surface, one new
view mode. No complexity-tracking table required.

## Project Structure

### Documentation (this feature)

```text
specs/002-map-view-selection/
├── spec.md               # Feature specification
├── plan.md               # This file
├── research.md           # Phase 0 output (technology decisions)
├── data-model.md         # Phase 1 output (domain/state model)
├── contracts/            # Phase 1 output (component API contracts)
├── quickstart.md         # Phase 1 output (validation guide)
└── tasks.md              # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
frontend/
└── src/
    ├── App.tsx                       # UPDATED: view mode state + shared location draft;
    │                                 #         layout widens in map mode; wires form ↔ map sync
    ├── lib/
    │   └── location.ts               # NEW: pure helpers — clamp, range-valid, haversine,
    │                                 #       km↔meters, center+edge → LocationQuery
    └── components/
        ├── ViewModeToggle.tsx        # NEW: list/map segmented control (ui/Button variants)
        ├── ViewModeToggle.stories.tsx# NEW: Storybook demo
        ├── FlyOverMap.tsx            # NEW: MapContainer + TileLayer (OSM) + draggable center
        │                             #       marker + draggable edge marker + radius Circle +
        │                             #       aircraft markers (read-only); pan/zoom free
        ├── FlyOverMap.stories.tsx    # NEW: Storybook demo with sample aircraft
        ├── FlyOverForm.tsx           # UPDATED: controlled (value/onChange) so map edits the
        │                             #       inputs and input edits move the map
        ├── FlyOverList.tsx           # unchanged
        ├── index.ts                  # UPDATED: export ViewModeToggle, FlyOverMap (+ prop types)
        ├── ui/                       # existing primitives reused (Button, Card, Badge, Input)
        └── __tests__/                # NEW/UPDATE: FlyOverMap, ViewModeToggle tests (mocked
                                      #       react-leaflet); updated FlyOverForm + App tests
```

**Structure Decision**: The feature stays entirely inside the existing `frontend` package; no
third package or backend change is introduced. The two existing packages (`backend`, `frontend`)
are preserved per the module's fixed package organization.

## Complexity Tracking

> None required — Constitution Check passed without violations.