# Implementation Plan: Dashboard Embed Components

**Branch**: `feature/006-dashboard-components` | **Date**: 2026-09-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-dashboard-components/spec.md`

## Summary

Ship two self-sufficient, embeddable widgets in the `@sousa99/fly-over-tracker-components`
frontend package, for use inside the external homesweethome dashboard:

1. **`FlyOverWidget`** — a read-only map centered on a configured location (radius circle,
   aircraft markers) with the aircraft listed beneath it, driven entirely by props
   (`location`, `autoRefresh`, `baseUrl`). The list beneath the map uses the compact
   `AircraftMapCard`, matching the SPA's map mode.
2. **`ClosestAircraftCard`** — a compact card showing the single nearest aircraft within the
   configured radius, rendered with the full `AircraftCard` (list-view) presentation, with a
   smooth transition when the closest aircraft changes and the same configuration surface.

The **published package surface** of `@sousa99/fly-over-tracker-components` is exactly these
two widgets plus their prop types and the shared types they reference. The SPA components, UI
primitives, and the API client are internal implementation details bundled into the widgets.

Both widgets are **self-sufficient** (they fetch and refresh their own data from the module's
query capability) and both fill the available container width; the map widget expands the map
to the available vertical space and lets the list take its natural height (scrollable), while
the card takes only its natural height. Both show a small top-corner updating indicator while
a background refresh is in flight. No backend or API changes are required — the closest
aircraft is the first item of the existing distance-sorted `FlyOverResult` (see `research.md`).

## Technical Context

**Language/Version**: TypeScript (strict, ESM), React 19

**Primary Dependencies**: existing frontend deps only — `react`, `leaflet`, `react-leaflet`,
`@tanstack/react-query`, `tailwindcss@4`, `vitest`, Storybook. No new dependencies required.

**Storage**: None. Widgets fetch on demand; no persistence.

**Testing**: Vitest + Testing Library. The existing `react-leaflet` mock (`src/test/`) renders
the map jsdom-safely; fetch is mocked for the query layer; fake timers drive auto-refresh.

**Target Platform**: Browser — dashboard host (external homesweethome app); also runs inside
the SPA's Storybook workbench.

**Project Type**: Publishable component library (frontend package `@sousa99/fly-over-tracker-components`).

**Performance Goals**: Both widgets render valid content within 3 seconds of mount; auto-refresh
updates ≥90% of expected intervals over a 10-minute window; a change in the closest aircraft is
presented with a smooth transition (no abrupt swap).

**Constraints**: No stale data presented as fresh on feed outage; deterministic closest-aircraft
selection; layout fills available width and constrains vertical usage as specified.

**Scale/Scope**: Two new exported components + one internal shared query hook + one internal
read-only map view + one internal updating indicator; SPA behavior unchanged.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The `.specify/memory/constitution.md` file is the unfilled template (no ratified principles or
gates). The module's governing docs (`setup.md`, `docs/clarify.md`, `AGENTS.md`) require:
- Single frontend package (SPA + Storybook + components library from the same source) ✅
- No new backend surface for a frontend-only feature; the existing `/api/fly-overs` result is
  reused unchanged (closest = first item) ✅
- Quality gates: `pnpm lint`, `pnpm format`, `pnpm test`, `pnpm typecheck`,
  `node scripts/scaffold.mjs --check` pass before merge ✅
- Living documentation — JSDoc and docs updated in the same change as the code ✅

**No violations.** Complexity is deliberately low: no new dependencies, no backend changes, no
storage, no new provider contracts for the host. No complexity-tracking table required.

## Project Structure

### Documentation (this feature)

```text
specs/006-dashboard-components/
├── spec.md               # Feature specification
├── plan.md               # This file
├── research.md           # Phase 0 output (technology decisions)
├── data-model.md         # Phase 1 output (domain model)
├── contracts/            # Phase 1 output (public component API)
├── quickstart.md         # Phase 1 output (validation guide)
└── tasks.md              # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
frontend/
└── src/
    ├── index.ts                          # + FlyOverWidget, ClosestAircraftCard (+ prop types)
    ├── index.css                         # + closest-change transition keyframes
    ├── api/
    │   ├── client.ts                     # getFlyOvers(query, baseUrl?) — optional base URL
    │   └── __tests__/client.test.ts      # + baseUrl coverage
    ├── hooks/
    │   ├── useFlyOversQuery.ts           # NEW shared query hook (internal)
    │   └── __tests__/useFlyOversQuery.test.ts
    ├── components/
    │   ├── AircraftMapView.tsx           # NEW read-only map (internal)
    │   ├── FlyOverWidget.tsx             # NEW map + list widget (exported)
    │   ├── ClosestAircraftCard.tsx       # NEW closest-plane card (exported)
    │   ├── UpdatingIndicator.tsx         # NEW top-corner update feedback (internal)
    │   ├── index.ts                      # + exports for the two widgets + prop types
    │   ├── FlyOverWidget.stories.tsx     # NEW Storybook demo (mocked fetch)
    │   ├── ClosestAircraftCard.stories.tsx # NEW Storybook demo (mocked fetch)
    │   └── __tests__/
    │       ├── FlyOverWidget.test.tsx    # NEW
    │       └── ClosestAircraftCard.test.tsx # NEW
    └── lib/__tests__/exports.test.ts     # + assertions for the new exports
```

**Structure Decision**: The existing single frontend package is reused as-is; the feature adds
four new modules under `frontend/src/` (two exported components, one internal map view, one
internal indicator) plus one shared query hook and a small backward-compatible `getFlyOvers`
extension. No new package or backend surface is introduced, consistent with the module's fixed
package organization and the "homesweethome integration is out of scope" decision.

## Complexity Tracking

> None required — Constitution Check passed without violations.