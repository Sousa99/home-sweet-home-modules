# AGENTS.md — current-time

Guidance for contributors (human or AI) working in the **current-time** module.

## Purpose

A frontend-only Home Sweet Home module: a dashboard-style page showing the current local time
(hours, minutes, seconds) that ticks live, works fully offline, and remembers a 12/24-hour
format preference. It uses the shared light amber/slate visual language and publishes two
embeddable widgets (`ClockCard`, `ClockPlain`) with identical props (align, defaultFormat,
switchable, aspectRatio) that fill the available space and scale the readout. There is no
backend, no database, and no network dependency.

## Packages & layout

```text
frontend/   @sousa99/current-time-components — one package: SPA + components library
```

## Common commands (from the repo root)

```bash
pnpm --filter ./modules/current-time/frontend dev          # SPA dev server (default :5173)
pnpm --filter ./modules/current-time/frontend storybook    # component workbench (default :6006)
pnpm --filter ./modules/current-time/frontend test         # Vitest suite
pnpm --filter ./modules/current-time/frontend typecheck    # tsc --noEmit
pnpm --filter ./modules/current-time/frontend build        # SPA build (dist-app)
pnpm --filter ./modules/current-time/frontend build:lib    # library build (dist-lib)
pnpm --filter ./modules/current-time/frontend build-storybook # static workbench (dist-storybook)
```

The module is covered by the shared gates: `pnpm lint`, `pnpm format`, `pnpm typecheck`,
`pnpm test` (all run from the repo root and include this module).

## Conventions & quality gates

- **Test-first (non-negotiable)**: any behavior change starts with a failing Vitest test, then
  implementation, then a green run. See `.opencode/skills/test-first`.
- **Shared presets**: `eslint.config.mjs`, `prettier.config.mjs`, and `tsconfig.base.json` at
  the module root extend `@sousa99/homesweethome-config`. No per-module config drift.
- **Quality gates**: ESLint, Prettier, typecheck, and the Vitest suite must pass before merge
  (enforced by CI).
- **Releases**: independent — `@sousa99/current-time-components` versions on its own changesets
  fixed group, starting at `0.0.1`. Use `.opencode/skills/changelog-release-notes`.
- **Commits**: conventional-commit style; git/GitHub operations go to the `github-helper` agent.

## Agent & skill routing

Delegate by task; the main assistant must not perform git/GitHub operations.

| Task | Delegate to |
|------|-------------|
| Commit, push, branches, PRs, issues, CI/Actions | `github-helper` |
| Implementation (test-first) | `implementer` |
| Test suite / coverage verdict | `tester` |
| Pre-merge code review | `reviewer` |
| Version bumps + changeset verification (pre-PR) | `version-analyser` |
| Final minor-fix polish | `nitpicker` |
| README / setup.md / docs sync | `documenter` |

Skills: load on demand — `test-first`, `quality-gates`, `commit-hygiene`,
`changelog-release-notes`, `spec-driven-development`.

## Codebase orientation

- `frontend/src/lib/useCurrentTime.ts` — live-clock hook: one `Date` snapshot, one-second
  interval, resync on `visibilitychange`/`focus`, cleanup on unmount.
- `frontend/src/lib/timeFormat.ts` — pure `formatTimeParts`, plus `getTimeFormat(fallback)`/
  `setTimeFormat` persisted under the local-storage key `current-time:time-format` (default `'24h'`).
- `frontend/src/lib/useClockFormat.ts` — widget format state: seeds from the stored preference
  when `switchable` (else `defaultFormat`) and persists only when `switchable`.
- `frontend/src/components/clock/ClockCard.tsx` / `ClockPlain.tsx` — the two published widgets
  (identical props: `align`, `defaultFormat`, `switchable`, `aspectRatio`); share the internal
  `ClockWidget` core (live time + fill-and-scale sizing + toggle).
- `frontend/src/components/clock/ClockFace.tsx` / `TimeFormatToggle.tsx` — readout and toggle.
- `frontend/src/components/clock/Clock.mdx` + `.stories.tsx` — workbench docs and previews.
- `frontend/src/pages/DashboardPage.tsx` — the dashboard layout (default route `/`).
- `frontend/tests/` — Vitest + Testing Library coverage (ticking, resync, formatting, persistence,
  widget props, fill/scale, dashboard flows).

The public package surface is documented under
`specs/003-current-time-dashboard/contracts/frontend-api.md`; do not remove or rename exported
members without a version bump.