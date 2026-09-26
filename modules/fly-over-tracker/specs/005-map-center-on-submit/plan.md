# Implementation Plan: Center Map on Selection Submit

**Branch**: `feature/005-map-center-on-submit` | **Date**: 2026-09-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-map-center-on-submit/spec.md`

## Summary

Frontend-only change in the `frontend` package. After a user presses "Find aircraft" (or after
switching to map mode when a submit happened in list mode), the map view animates so the submitted
center is centered in the frame and the selection circle fills roughly 90% of it. The submitted
`LocationQuery` doubles as the fit request:

1. **`App.tsx`** passes the last submitted query as a new `fitRequest` prop to `FlyOverMap`.
   Because `query` only changes on submit, the fit never fires for draft edits, marker drags,
   pan/zoom, or refreshes (FR-005). Because the map only mounts in map mode, a submit made in list
   mode leaves the fit pending and applies it on first map mount (FR-003); switching modes without
   a new submit does not refit (FR-004).
2. **`FlyOverMap.tsx`** gains a `MapFitController` child inside `MapContainer` that uses
   react-leaflet's `useMap()` and calls `flyToBounds` with the circle's bounding box, padded so the
   circle fills almost the whole frame, with a `maxZoom` cap for very small radii (FR-001, FR-002,
   FR-006).
3. **`lib/location.ts`** gains a pure, unit-testable `circleBounds(center, radiusKm)` helper
   (SW/NE corners via the existing `destPoint`), so the fit geometry is testable without Leaflet.

No backend changes, no new dependencies. `useMap`/`flyToBounds` are already provided by the
existing react-leaflet peer dependency.

## Technical Context

**Language/Version**: TypeScript (ESM, strict), React 19, Vite 6, Tailwind CSS v4

**Primary Dependencies**:
- Frontend: existing `react-leaflet@5` + `leaflet@1.9` (`useMap`, `map.flyToBounds`). No new
  dependencies.
- Backend: unchanged — no changes at all.

**Storage**: None — the fit request is the existing `query` state in `App`, plus a small
`fittedQuery` state tracking which submitted query the map has already fitted; no persistence.

**Testing**: Vitest + Testing Library. The existing react-leaflet mock
(`frontend/src/test/react-leaflet-mock.tsx`) is extended with a `useMap` hook returning a fake map
whose `flyToBounds`/`flyTo` calls are recorded, mirroring the current `markerStore` pattern:
- `location.test.ts` — `circleBounds` unit tests (pure geometry, no DOM).
- `FlyOverMap.test.tsx` — fit on mount when `fitRequest` is present; refit when `fitRequest`
  changes; no fit when only `center`/`radiusKm` change or when `fitRequest` is unchanged; `maxZoom`
  applied.
- `App.test.tsx` — submit in map mode triggers a fit; submit in list mode then switch to map
  triggers a fit; switching back/forth without a new submit does not refit.
- Storybook provides manual validation of the new fit behavior.

**Target Platform**: Modern browser SPA; the same components ship in the publishable components
library (`vite.lib.config.ts`). No platform-specific constraints.

**Performance Goals**: The fit animation completes without measurable impact on the existing
submit flow; no regression in query latency or map interactivity (SC-004).

**Constraints**: The fit must apply only to a new submission (FR-005); the view must never be moved
by draft edits, marker drags, pan/zoom, or refresh. Very small radii must not over-zoom (FR-006).
The map-error fallback to the list view is preserved (FR-007).

**Scale/Scope**: One frontend-only feature: a `fitRequest` prop + `MapFitController` inside
`FlyOverMap`, a `circleBounds` helper, mock/test updates, a Storybook story, and a contract update.
No backend changes, no new API surface.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The `.specify/memory/constitution.md` file is the unfilled template (no ratified principles or
gates). The module's governing docs (`setup.md`, `docs/clarify.md`, `AGENTS.md`) require:
- Single frontend package — SPA + Storybook + components library share one source ✅
- Components-first build — updated `FlyOverMap` remains exported from `components/index.ts` and
  demoed in Storybook ✅
- Quality gates: `pnpm lint`, `pnpm format`, `pnpm test`, `pnpm typecheck`,
  `node scripts/scaffold.mjs --check` pass before merge ✅
- Living documentation — JSDoc and docs updated in the same change as the code ✅

**No violations.** Complexity is deliberately low: no storage, no backend surface, no new
dependency. The fit logic is one small controller component plus one pure helper. No
complexity-tracking table required.

## Project Structure

### Documentation (this feature)

```text
specs/005-map-center-on-submit/
├── spec.md               # Feature specification
├── plan.md               # This file
├── research.md           # Phase 0 output (technology decisions)
├── data-model.md         # Phase 1 output (frontend state model)
├── contracts/            # Phase 1 output (component API contract)
├── quickstart.md         # Phase 1 output (validation guide)
└── tasks.md              # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
frontend/
└── src/
    ├── App.tsx                     # UPDATED: pass `fitRequest={query}` to FlyOverMap
    ├── lib/
    │   ├── location.ts             # UPDATED: add `circleBounds(center, radiusKm)`
    │   └── __tests__/
    │       └── location.test.ts    # UPDATED: circleBounds unit tests
    ├── test/
    │   └── react-leaflet-mock.tsx  # UPDATED: add `useMap` fake recording flyToBounds
    └── components/
        ├── FlyOverMap.tsx          # UPDATED: `fitRequest` prop + MapFitController child
        ├── FlyOverMap.stories.tsx  # UPDATED: fit-on-submit story
        ├── index.ts                # unchanged (props only; no export change)
        └── __tests__/
            ├── FlyOverMap.test.tsx # UPDATED: fit behavior tests
            └── App.test.tsx        # UPDATED: submit-mode fit tests
```

**Structure Decision**: The feature stays entirely inside the existing `frontend` package; the two
existing packages (`backend`, `frontend`) are preserved per the module's fixed package
organization. The map's public component keeps its place in `components/`; only its props and
internal wiring change.

## Complexity Tracking

> None required — Constitution Check passed without violations.