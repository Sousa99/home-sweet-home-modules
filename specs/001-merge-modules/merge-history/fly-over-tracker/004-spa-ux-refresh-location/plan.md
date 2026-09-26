# Implementation Plan: SPA UX Improvements

**Branch**: `feature/004-spa-ux-refresh-location` | **Date**: 2026-09-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-spa-ux-refresh-location/spec.md`

## Summary

Frontend-only improvements to the fly-over SPA. Four changes in the `frontend` package:

1. **Centered selection panel** — the coordinate form and the list/map toggle are horizontally
   centered in a single column of controls in both list and map modes (FR-001).
2. **Current location** — a "Use my current location" control above the coordinate inputs fills
   latitude/longitude from the browser geolocation API, preserving the radius, without
   auto-submitting (FR-002–FR-006).
3. **Auto-refresh** — a rate selector (off / 5 / 10 / 30 / 60 seconds) re-runs the last submitted
   query at the chosen cadence. Data fetching is handled by **TanStack Query**: the SPA's fly-over
   query runs through `useQuery` with `refetchInterval` driving the cadence, `enabled` gating on a
   submitted query, built-in fetch deduplication preventing overlapping refreshes, and `refetch()`
   backing the manual refresh action (FR-007–FR-011). Existing results stay visible during a
   background refresh.
4. **Favicon** — an aircraft SVG glyph in the theme color served by the SPA (FR-012).

No backend changes: the existing `/api/fly-overs` query capability is reused as-is. The backend's
existing bounded 429 retry (`lib/retry.ts`) already absorbs the extra load of frequent refreshes.

## Technical Context

**Language/Version**: TypeScript (ESM, strict), React 19, Vite 6, Tailwind CSS v4

**Primary Dependencies**:
- Frontend: existing `react@19`, `vite`, `tailwindcss@4`, `vitest`, Storybook — **new dependency**:
  `@tanstack/react-query@5` (data fetching + `refetchInterval` polling). The favicon is a static
  SVG asset in `frontend/public`.
- Backend: unchanged — no new dependencies.

**Storage**: None — `LocationQuery`, view mode, refresh rate, and geolocation state are component
state lifted to `App`. No persistence across reloads (rate default is off).

**Testing**: Vitest + Testing Library. jsdom implements neither geolocation nor reliable timers:
- Geolocation is mocked by defining `navigator.geolocation` (e.g., `vi.stubGlobal`/explicit mock)
  per test; success and denial/timeout paths are covered.
- App tests render inside a fresh `QueryClientProvider` (per-test client, `retry: false`);
  auto-refresh uses `vi.useFakeTimers()` with `advanceTimersByTimeAsync` and synchronous
  `fireEvent` interactions (userEvent hangs under fake timers), asserting `getFlyOvers` call
  counts at each cadence.
- The centering change is asserted by component structure/classes in `App.test.tsx`.
- Storybook provides manual validation of the new `RefreshRateSelect` and the updated `FlyOverForm`.

**Target Platform**: Modern browser SPA; the same components ship in the publishable components
library (`vite.lib.config.ts`). Geolocation requires a secure context (HTTPS or localhost) —
a browser-enforced constraint, documented in the spec assumptions.

**Performance Goals**: A successful geolocation lookup fills the inputs within 1 second (SC-002);
an auto-refresh tick adds negligible overhead beyond a normal query; no regression in the existing
typed flow.

**Constraints**: No overlapping refreshes (FR-010); a non-off rate must not query before a query
exists (FR-008, edge case); geolocation must never change inputs on denial/failure (FR-005); the
SPA build (`dist-app`) must serve the favicon from `public/` automatically.

**Scale/Scope**: One frontend-only feature: `RefreshRateSelect` + a data-fetching refactor of
`App` to TanStack Query, plus updates to `FlyOverForm`, `main.tsx`, `index.html`, and `public/`.
No backend changes, no new API surface.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The `.specify/memory/constitution.md` file is the unfilled template (no ratified principles or
gates). The module's governing docs (`setup.md`, `docs/clarify.md`, `AGENTS.md`) require:
- Single frontend package — SPA + Storybook + components library share one source ✅
- Components-first build — new/updated components are exported from `components/index.ts` and
  demoed in Storybook ✅
- Quality gates: `pnpm lint`, `pnpm format`, `pnpm test`, `pnpm typecheck`,
  `node scripts/scaffold.mjs --check` pass before merge ✅
- Living documentation — JSDoc and docs updated in the same change as the code ✅

**No violations.** Complexity is deliberately low: no storage, no new backend surface. One new
runtime dependency (TanStack Query) is justified — it provides the polling cadence and overlap
guard natively instead of a hand-rolled interval, per the user's direction. No complexity-tracking
table required.

## Project Structure

### Documentation (this feature)

```text
specs/004-spa-ux-refresh-location/
├── spec.md               # Feature specification
├── plan.md               # This file
├── research.md           # Phase 0 output (technology decisions)
├── data-model.md         # Phase 1 output (frontend state model)
├── contracts/            # Phase 1 output (component API contracts)
├── quickstart.md         # Phase 1 output (validation guide)
└── tasks.md              # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
frontend/
├── public/
│   └── favicon.svg                 # NEW: aircraft glyph (PLANE_SVG_PATH geometry) in theme
│                                   #       amber (#d97706); auto-copied to dist-app by Vite
├── index.html                      # UPDATED: <link rel="icon" type="image/svg+xml"
│                                   #       href="/favicon.svg" />
└── src/
    ├── App.tsx                     # UPDATED: centered controls column; TanStack useQuery
    │                               #       fetch with refetchInterval from `refreshRate`;
    │                               #       wires RefreshRateSelect + FlyOverForm geolocation
    ├── main.tsx                    # UPDATED: QueryClientProvider (retry: false,
    │                               #       refetchOnWindowFocus: false) around the app
    ├── lib/
    │   ├── location.ts             # unchanged (clampLat/clampLng/isValid reused for
    │   │                           #       geolocation validation)
    │   └── aircraftIcon.ts         # unchanged (PLANE_SVG_PATH reused for the favicon)
    └── components/
        ├── RefreshRateSelect.tsx   # NEW: labeled Select — off/5/10/30/60 seconds
        ├── RefreshRateSelect.stories.tsx  # NEW: Storybook demo
        ├── FlyOverForm.tsx         # UPDATED: "Use my current location" control above the
        │                           #       coordinate inputs + inline geolocation alerts
        │                           #       (denied / timeout / unavailable / unsupported)
        ├── FlyOverForm.stories.tsx # UPDATED: geolocation demo (mocked)
        ├── index.ts                # UPDATED: export RefreshRateSelect + RefreshRate type
        └── __tests__/              # NEW/UPDATED: RefreshRateSelect.test.tsx; updated
                                    #       FlyOverForm.test.tsx (geolocation), App.test.tsx
                                    #       (auto-refresh timers, centering)
```

**Structure Decision**: The feature stays entirely inside the existing `frontend` package; the two
existing packages (`backend`, `frontend`) are preserved per the module's fixed package
organization. New UI surface is added as components (per the components-first convention), not
inline JSX.

## Complexity Tracking

> None required — Constitution Check passed without violations.