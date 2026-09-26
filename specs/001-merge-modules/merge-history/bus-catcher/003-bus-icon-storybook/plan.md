# Implementation Plan: Bus Icon Favicon & Stop List Component Showcase

**Branch**: `003-bus-icon-storybook` | **Date**: 2026-09-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-bus-icon-storybook/spec.md`

## Summary

Two deliverables. (1) **Component showcase + package**: stand up Storybook 9
(`@storybook/react-vite` + `@storybook/addon-docs`, already in devDependencies)
for the SPA frontend and publish the stop **card widget** — a self-fetching
widget that displays the waiting times for a given stop and a set of buses
(stop name + line-filter badge header; stop list + realtime coverage body; its
own loading/error/ready fetch lifecycle with polling). It is extracted from
`Dashboard.tsx`, showcased in Storybook as six stories (**Default**,
**ScheduleOnly**, **Empty**, **Loading**, **Error**, **Missing**) with an MDX
docs page that places prose and a `<Controls>` props table next to interactive
`<Canvas>` examples (the props are now primitives, so controls render
correctly — fixing the earlier "props not showing" issue), and it is the
component exported through the `@sousa99/bus-catcher-components` package via a
new `src/index.ts` entry (the inner `StopTimesList` stays a private building
block). (2) **Favicon**: add a Lucide `bus-front` SVG (ISC) to
`frontend/public/favicon.svg` and reference it from `frontend/index.html`.
Storybook needs a `viteFinal` hook to apply the Tailwind v4 plugin
(CJS-require limitation in `main.ts`) and a `preview.ts` importing
`src/index.css`. The `build:lib` dts bundling needs `@microsoft/api-extractor`
as a devDependency (added to the scaffold template).

## Technical Context

**Language/Version**: Node 24, TypeScript 5.7 (strict), React 19, Vite 6.

**Primary Dependencies**: already installed — `storybook@^9.1.20`,
`@storybook/react-vite@^9.1.20`, `@storybook/addon-docs@^9.1.20`; plus
existing `@tailwindcss/vite`, `@vitejs/plugin-react`. One new devDependency:
`@microsoft/api-extractor` (required by `vite-plugin-dts` `bundleTypes` for
the package `build:lib`).

**Storage**: N/A — a static SVG asset (`public/favicon.svg`) and story/MDX
source files; no runtime storage or API.

**Testing**: Vitest + Testing Library (existing). No new runtime logic; the
existing `StopTimesList.test.tsx` already covers the three states. The
feature-specific validations are the `storybook build` (Docs included) and
manual favicon checks in `quickstart.md`.

**Target Platform**: evergreen browsers (Chrome/Firefox/Safari); Storybook
dev/build on localhost.

**Project Type**: web application (React SPA) exposing a component library
(`@sousa99/bus-catcher-components`, `build:lib`).

**Performance Goals**: Storybook dev startup is acceptable; favicon stays
~1KB; zero runtime perf impact on the SPA (favicon is a static asset,
stories are dev-only and excluded from the app bundle).

**Constraints**: the showcased and published component MUST be the stop
**card widget** the SPA uses (FR-002, FR-009, FR-010, SC-004 — no duplicate;
the inner list is a private building block); the widget MUST fetch its own
waiting times; Storybook MUST not be added to the SPA bundle; Tailwind v4
utilities MUST render inside Storybook (viteFinal + preview import); the
package MUST build (`build:lib`) and publish `StopCard` with its data types;
favicon MUST be legible at tab size and in dark mode (FR-007); all quality
gates pass before merge.

**Scale/Scope**: one widget (StopCard, extracted from Dashboard.tsx), its
package export entry, + one favicon asset; no backend, no schema.

## Constitution Check

*GATE: must pass before implementation.*

- **I Location-Scoped Data**: untouched — the showcase is presentation-only;
  `StopTimesList` consumes already-resolved per-stop `Passing[]`; no queries
  added. ✅
- **II Freshness-Aware Realtime**: preserved — story fixtures are static and
  the component's Live/Schedule attribution logic is unchanged; no data
  freshness surfaces are altered. ✅
- **III Provider Abstraction**: untouched; no provider or service-layer
  changes. ✅
- **IV Test-First (NON-NEGOTIABLE)**: no new runtime logic is introduced —
  the feature is declarative (Storybook config, CSF stories, MDX, one static
  SVG). Existing component tests cover the three states; the Storybook build
  and favicon checks are the feature validations. Any logic added during
  implementation (e.g. a story helper) MUST be test-first. ✅
- **V Observability & Correct Time Handling**: untouched; no logging or time
  code changes. ✅
- **Data & Integration Constraints**: no data ingestion, caching, or PII;
  REST/MCP service layer unaffected. ✅
- **Quality gates**: `pnpm lint`, `pnpm format`, `pnpm test`,
  `pnpm typecheck`, `node scripts/scaffold.mjs --check` all pass before merge. ✅
- **Complexity**: one new config directory (`.storybook/`) and a favicon are
  the minimum for the requested deliverables; no unjustified layering. No
  gate violations.

## Project Structure

### Documentation (this feature)

```text
specs/003-bus-icon-storybook/
├── plan.md              # This file
├── research.md          # Storybook 9 / Tailwind / MDX / favicon decisions
├── data-model.md        # StopCard states + Passing/RealtimeInfo DTOs
├── quickstart.md        # Run guide (showcase + favicon + package + gates)
├── contracts/
│   └── stop-card.md     # Published component + docs + package contract
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # (/speckit.tasks output)
```

### Source Code (repository root)

```text
frontend/
├── index.html                     # + <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
├── package.json                   # + devDep @microsoft/api-extractor (dts bundling)
├── public/
│   └── favicon.svg                # NEW: Lucide bus-front icon (ISC), fixed stroke colors,
│                                  #   24×24 viewBox, prefers-color-scheme block, ~1KB
├── .storybook/
│   ├── main.ts                    # NEW: framework '@storybook/react-vite',
│   │                              #   addons ['@storybook/addon-docs'],
│   │                              #   stories globs incl. ../src/**/*.mdx,
│   │                              #   viteFinal -> await import('@tailwindcss/vite')
│   └── preview.ts                 # NEW: import '../src/index.css'; tags: ['autodocs']
└── src/
    ├── index.ts                   # NEW: package entry (build:lib) — exports StopCard,
    │                              #   StopCardProps, FetchStopTimes, Passing,
    │                              #   RealtimeInfo, StopTimesResponse
    └── components/
        ├── StopCard.tsx           # NEW: self-fetching widget extracted from Dashboard
        ├── StopCard.test.tsx      # NEW: fetch lifecycle tests (loading/ready/error/
        │                          #      missing, polling, custom fetcher)
        ├── StopCard.stories.tsx   # NEW: CSF — Default / ScheduleOnly / Empty / Loading /
        │                          #      Error / Missing (typed args + fetchTimes fixtures)
        ├── StopCard.mdx           # NEW: docs page, <Meta of={Stories}> + <Controls> +
        │                          #      <Canvas of={...}> per story + prose
        ├── StopTimesList.tsx      # unchanged — private building block of the widget
        ├── StopTimesList.test.tsx # unchanged — covers the inner list states
        ├── StopCoverage.tsx       # unchanged — private coverage notice
        └── pages/Dashboard.tsx    # renders the <StopCard> widget (fetching is internal)
```

**Structure Decision**: frontend-only change, Option 2 (web application). The
Storybook config lives in `frontend/.storybook/` (Storybook's required
location), stories/MDX colocate with their component per Storybook
convention, and the favicon lives in Vite's `public/` for stable, un-hashed
URLs. The stop card is extracted from `Dashboard.tsx` into
`src/components/StopCard.tsx` as a presentational component (fetching stays
in the page), and `src/index.ts` becomes the package entry the existing
`vite.lib.config.ts` already expects. No backend changes.

## Complexity Tracking

No constitution violations to justify. The `.storybook/` directory is
Storybook's fixed location; the `viteFinal` hook is required because
`@tailwindcss/vite` has no CJS entry (top-level import in `main.ts` fails)
and auto-merge is known-flaky in SB9; the preview CSS import is required for
Tailwind v4 utility generation. These are the minimum moving parts for the
requested deliverables.