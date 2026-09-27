# Implementation Plan: Current Time Dashboard

**Branch**: `003-current-time-dashboard` | **Date**: 2026-09-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-current-time-dashboard/spec.md` (updated by `/speckit.clarify` session 2026-09-27: shared light visual style, two embeddable widgets with shared props, component workbench + docs).

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

A frontend-only Home Sweet Home module displaying the current local time (hours, minutes, seconds) in a polished dashboard. Per the clarified scope: the dashboard and the published widgets adopt the other modules' shared **light amber/slate visual language** (white rounded cards, amber accents); the clock is published as **two widgets with identical props** — `ClockCard` (with card chrome) and `ClockPlain` (without) — each exposing `align` (left/center/right), `defaultFormat` (12h/24h), `switchable` (boolean), and an optional `aspectRatio`; the widgets **expand to fill available width/height with the readout scaling to fit**, optionally constrained by an aspect ratio. The module ships a **component workbench with a documentation addon and a written `.mdx` docs page** per component, following the existing modules' Storybook conventions. Stack unchanged: React 19 + Vite + Tailwind CSS v4 + Vitest, identity `@sousa99/current-time-components` under `modules/current-time/frontend`, extending the shared presets.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), React 19, Node 24 (pnpm 11 workspace)

**Primary Dependencies**: Vite 6, React 19 + react-dom, Tailwind CSS v4, react-router (SPA shell); peer/UI libs `lucide-react`, `motion`; Storybook 9 + `@storybook/addon-docs` (workbench + `.mdx` docs, mirroring existing modules); `@sousa99/homesweethome-config` for shared presets

**Storage**: N/A (no server storage). One persisted value — the user-chosen 12/24-hour format — kept on-device in browser local storage under key `current-time:time-format` (local-first, private by default)

**Testing**: Vitest + @testing-library/react + jsdom; fake timers for ticking behavior; component tests for both widgets across align/defaultFormat/switchable

**Target Platform**: Modern web browsers on desktop and mobile; offline-capable; widgets embeddable in cards in other modules' dashboards

**Project Type**: Frontend-only module (SPA + components library, matching the existing frontend module shape, plus Storybook)

**Performance Goals**: Readout advances every second with no accumulated drift; displayed time never differs from the device clock by more than 1 second while visible

**Constraints**: Offline-capable, no backend/service, local-first and private; shared light visual language; identical props on both widgets; widgets fill available space and scale the readout, with optional aspect-ratio constraint; must pass shared ESLint/Prettier/typecheck/Vitest gates

**Scale/Scope**: Single household user; one dashboard page; two publishable widgets; low traffic

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Compliance | Notes |
|-----------|------------|-------|
| I. Module-First | ✅ Pass | Ships as a self-contained module under `modules/current-time/`, documented with README + `setup.md`; independently runnable. |
| II. Local-First & Private by Default | ✅ Pass | Fully offline-capable; the only persisted data (format preference) stays on the device. |
| III. Declared Identity & Uniform Tooling | ✅ Pass | Directory `modules/current-time/frontend` matches package name `@sousa99/current-time-components`; extends `@sousa99/homesweethome-config` presets; registered as a changesets fixed group in `.changeset/config.json`; Storybook setup mirrors existing modules (no config drift). |
| IV. Test-First (NON-NEGOTIABLE) | ✅ Pass | Vitest tests written first (red), verified failing, then implemented (green) — live-time hook, formatting, both widgets, alignment, switchable semantics, dashboard rendering. |
| V. Contract & Integration Testing | ✅ Pass | No REST/MCP/backend contracts (frontend-only); the published package surface (two widgets + lib API) and the persisted-preference schema are documented in `contracts/frontend-api.md` and covered by component/unit tests. |

**Justified deviation (scope, user-directed)**: Existing modules ship a backend package; this module is explicitly frontend-only per the user's request (spec Assumptions). No principle mandates a backend; not a complexity increase, so no Complexity Tracking entry is required.

**Post-Phase 1 re-check (after research.md, data-model.md, contracts/, quickstart.md)**: ✅ design keeps the module self-contained, offline-capable, identity-declared, shared-preset-extended, and test-first. No new violations.

## Project Structure

### Documentation (this feature)

```text
specs/003-current-time-dashboard/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
modules/current-time/
├── AGENTS.md                        # Module-level guidance (pattern of existing modules)
├── README.md                        # Module documentation
└── frontend/
    ├── public/
    ├── index.html
    ├── .storybook/
    │   ├── main.ts                  # Storybook 9: stories glob, @storybook/addon-docs, Tailwind plugin
    │   └── preview.ts               # imports ../src/index.css
    ├── src/
    │   ├── components/
    │   │   ├── ui/
    │   │   │   └── card.tsx         # Card/CardHeader/CardTitle/CardContent (shared light style)
    │   │   └── clock/
    │   │       ├── ClockFace.tsx        # pure readout (hours:minutes:seconds + AM/PM)
    │   │       ├── TimeFormatToggle.tsx # 12h/24h control
    │   │       ├── ClockWidget.tsx      # internal shared core (time + format + sizing + chrome)
    │   │       ├── ClockCard.tsx        # published widget: readout + toggle + Card chrome, fills + scales
    │   │       ├── ClockPlain.tsx       # published widget: readout + toggle, no card chrome, fills + scales
    │   │       ├── ClockCard.stories.tsx
    │   │       ├── ClockPlain.stories.tsx
    │   │       ├── Clock.mdx             # component docs page (workbench)
    │   │       └── DashboardPage.stories.tsx
    │   ├── lib/
    │   │   ├── utils.ts              # cn helper (matches existing modules)
    │   │   ├── useCurrentTime.ts     # live-ticking time hook (1s, self-correcting)
    │   │   └── timeFormat.ts         # format/parse helpers + persisted preference
    │   ├── pages/
    │   │   └── DashboardPage.tsx     # dashboard layout composing ClockCard
    │   ├── App.tsx
    │   ├── main.tsx
    │   ├── index.ts                  # components-library entry (exports)
    │   └── index.css                 # Tailwind v4 entry + shared amber/slate theme
    ├── tests/
    │   ├── setup.ts
    │   ├── use-current-time.test.ts
    │   ├── time-format.test.ts
    │   ├── clock-face.test.tsx
    │   ├── clock-widget.test.tsx     # ClockCard/ClockPlain: align, defaultFormat, switchable, fill/scale, aspectRatio
    │   ├── dashboard.test.tsx
    │   └── time-format-toggle.test.tsx
    ├── package.json                  # @sousa99/current-time-components (+ storybook scripts/deps)
    ├── tsconfig.json
    ├── vite.config.ts
    ├── vite.lib.config.ts
    └── vitest.config.ts
```

**Structure Decision**: Single frontend-only module following the established SPA + components-library shape of the existing modules, extended with the same Storybook setup they use (`.storybook/`, `@storybook/addon-docs`, `.mdx` + `.stories.tsx` co-located in `src/`, `cn` helper, `ui/card.tsx` primitives). Two published widget components (`ClockCard`, `ClockPlain`) share an internal core and identical props. No backend directory (user-directed scope). Module registered in `.changeset/config.json` as its own fixed group.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitution violations — the frontend-only module shape and the two-widget publishing model are user-directed scope decisions, documented in the spec and the Constitution Check above.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| _(none)_ | — | — |