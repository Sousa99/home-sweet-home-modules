# Research: Current Time Dashboard

**Branch**: `003-current-time-dashboard` | **Date**: 2026-09-27 | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Research resolves the technical unknowns from the plan's Technical Context (updated after the
2026-09-27 clarification session). Format per decision: Decision / Rationale / Alternatives considered.

## R-001 — Live ticking clock in a React frontend

**Decision**: A `useCurrentTime()` hook that holds a single `Date` snapshot in state, re-renders
from a `setInterval` scheduled each second, and forcibly re-snapshots on
`visibilitychange`/`focus` so the readout self-corrects whenever the tab regains visibility or the
device clock changes.

**Rationale**: A single authoritative `Date` snapshot per render keeps hours/minutes/seconds
consistent. Re-snapshotting on visibility/focus satisfies FR-003 (no accumulated drift) and the
tab-throttling edge case. Uses only platform `Date` APIs — zero extra dependencies, fully offline.

**Alternatives considered**:
- `requestAnimationFrame` loop: overkill for 1 Hz, throttled in background tabs; rejected.
- Three independent state values: transient inconsistency at boundaries; rejected.
- Time libraries (date-fns, luxon): no date/timezone math needed; rejected for weight.

## R-002 — Format preference persistence and widget seeding

**Decision**: `timeFormat.ts` keeps the typed `TimeFormat = '12h' | '24h'` union, pure
`formatTimeParts(date, format)`, and `getTimeFormat()`/`setTimeFormat()` backed by the
local-storage key `current-time:time-format`. The published widgets seed their display format as
follows: when `switchable` is `true`, the initial format is the stored preference if valid,
otherwise `defaultFormat`; user changes persist. When `switchable` is `false`, the format is fixed
to `defaultFormat` and nothing is stored or read.

**Rationale**: Satisfies FR-012/FR-013 (configurable default + switchable), FR-008 (remembered
choice) and the local-first/privacy principle. A single well-known storage key keeps the contract
documented and shared across embedded widgets (a single household preference).

**Alternatives considered**:
- Per-widget storage keys: inconsistent across embedded copies; rejected.
- Not persisting at all: breaks FR-008; rejected.
- `defaultFormat` always overriding stored value: ignores user preference; rejected.

## R-003 — Visual style

**Decision**: Adopt the other modules' shared visual language — light amber/slate palette, white
rounded cards (`rounded-xl border border-amber-200/70 bg-white p-4 shadow-sm`), amber accents —
for the dashboard, the `ui/card.tsx` primitives, and both widgets. The dark navy theme is removed.

**Rationale**: Clarified requirement (Q1 → Option A) and FR-015. The widgets are embedded in cards
inside the other modules' light dashboards, so a shared palette keeps the ecosystem coherent and
satisfies constitution Principle III's uniform-tooling spirit. Reuses the existing `Card` primitive
pattern verbatim (via a copied `ui/card.tsx` and `cn` helper).

**Alternatives considered**:
- Keep the dark theme everywhere: clashes with host dashboards; rejected.
- Dark theme as an opt-in prop: scope creep not requested; rejected.

## R-004 — Widget architecture (card vs plain, same props)

**Decision**: Two published components — `ClockCard` (card chrome via `ui/Card`) and `ClockPlain`
(no card chrome) — exposing identical props `{ align?: 'left' | 'center' | 'right';
defaultFormat?: '12h' | '24h'; switchable?: boolean }` (defaults: `'center'`, `'24h'`, `true`).
Both delegate to a single internal `ClockWidget` core that runs `useCurrentTime`, manages format
state, renders `ClockFace` (readout) and, when `switchable`, `TimeFormatToggle`. `align` maps to
the container's text/justify alignment so the readout positions left/center/right. Widgets
self-contain the live time (no time prop).

**Rationale**: The clarified requirement (Q2) mandates two widgets with identical options. A shared
internal core guarantees the two presentations differ only in chrome (SC-006) and avoids duplicated
state logic. Alignment is a pure layout mapping; `switchable` toggles toggle visibility (SC-008).

**Alternatives considered**:
- Single component with a `variant` prop: explicitly not what was asked (two widgets); rejected.
- A self-contained bundle widget including the toggle always: switchable would not be optional; rejected.
- Accepting a `time` prop: not requested; widgets self-tick via `useCurrentTime`; rejected.

## R-005 — Storybook workbench and `.mdx` documentation

**Decision**: Mirror the existing modules' Storybook setup exactly: `.storybook/main.ts` (stories
glob `../src/**/*.mdx` + `../src/**/*.stories.@(ts|tsx)`, `@storybook/addon-docs`, `@tailwindcss/vite`
plugin in `viteFinal`) and `.storybook/preview.ts` importing `../src/index.css`; package scripts
`storybook` (`storybook dev -p 6006`) and `build-storybook` (`storybook build -o dist-storybook`);
Storybook 9 + `@storybook/react-vite` in devDependencies. Docs: a `Clock.mdx` page (using
`Meta`/`Canvas`/`ArgTypes` from `@storybook/addon-docs/blocks`) documenting both widgets, plus
`ClockCard.stories.tsx`, `ClockPlain.stories.tsx`, and a `DashboardPage.stories.tsx`.

**Rationale**: The clarified requirement (US5, FR-014) asks for a workbench with a docs addon and a
written `.mdx` page per component; copying the existing modules' convention ensures zero config
drift and a consistent developer experience across the ecosystem.

**Alternatives considered**:
- A hand-rolled docs page (no Storybook): deviates from every other module; rejected.
- Docs-only `.mdx` without interactive stories: less useful for evaluating variants; rejected.

## R-006 — Testing strategy

**Decision**: Vitest + @testing-library/react + jsdom, matching existing modules. Fake timers for
the ticking hook; `timeFormat` unit tests; component tests asserting: both widgets render identical
readouts (differing only in chrome), each `align` value positions the readout, `defaultFormat`
seeds the format (12h shows AM/PM), `switchable={false}` hides the toggle and pins the format,
`switchable={true}` shows the toggle and persists changes; dashboard renders the card widget.

**Rationale**: Test-first is non-negotiable (constitution IV). Fake timers make the 1-second tick
deterministic; the widget tests map directly to FR-010…FR-013 and SC-006…SC-008 acceptance criteria.

**Alternatives considered**:
- Real timers + long `waitFor`: flaky and slow; rejected.
- Snapshot testing for time-dependent pages: brittle; targeted assertions chosen.

## R-007 — Module identity and packaging

**Decision**: New module slug `current-time`, frontend package `@sousa99/current-time-components`,
directory `modules/current-time/frontend`. Dual build (Vite app → `dist-app`; library → `dist-lib`)
plus Storybook scripts; own changesets fixed group in `.changeset/config.json`; version `0.0.1`.

**Rationale**: Declared identity and uniform tooling are constitution requirements. Mirroring the
existing frontend shape means CI gates and the release pipeline work with zero per-module changes
beyond `.changeset` registration.

**Alternatives considered**:
- App-only package (no `dist-lib`): deviates from every existing frontend package; rejected.
- Reusing another module's slug: violates declared identity; rejected.

## R-008 — Responsive fill-and-scale sizing

**Decision**: Both widgets expand to fill the available width and height of their container, and the
clock readout text scales to fit. An optional `aspectRatio` prop (CSS ratio string, e.g. `'16/9'`,
`'1/1'`, `'4/3'`) constrains the widget's proportions; when unset the widget fills available space
freely. Text scaling is implemented with a container-measured technique — the widget measures its
own box (ResizeObserver) and sizes the readout font relative to that measurement — with a
configurable minimum legibility clamp and the option to keep the toggle/controls at a fixed,
readable size.

**Rationale**: Satisfies the fill-and-scale requirement (spec FR-016/FR-017, SC-010) while keeping
the readout proportional to its surface and the optional aspect ratio cheap (native CSS
`aspect-ratio`, supported in all modern browsers). A container-measured font size is precise and
does not depend on a fixed viewport, unlike viewport units.

**Alternatives considered**:
- Fixed font sizes: do not fill the available space; rejected.
- `transform: scale` on fixed-size text: the layout box stays fixed, causing overflow/misalignment
  inside a scaling card; rejected.
- SVG-based text: heavy and poor for text selection/accessibility; rejected.
- CSS container query units (`cqw`): viable and lighter than a ResizeObserver; the internal core
  MAY use either, since the scaling mechanism is a non-contract implementation detail.

## Resolution status

All Technical Context items are resolved; no NEEDS CLARIFICATION markers remain.