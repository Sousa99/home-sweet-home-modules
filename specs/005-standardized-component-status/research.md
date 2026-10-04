# Research: Standardized Component Status

**Feature**: `005-standardized-component-status` | **Date**: 2026-10-04

Resolves every open technical unknown from the plan's Technical Context, following the
repo's constitution and existing module conventions.

---

## 1. Where the shared status bar lives

**Decision**: New workspace-internal package `packages/components/` named
`@sousa99/homesweethome-components`, consumed by all three modules' frontend packages.

**Rationale**:
- The pnpm workspace globs (`packages/*`) pick the directory up automatically — same
  membership as the sanctioned `packages/config` shared-package precedent.
- Following `@sousa99/homesweethome-config` naming, the shared package is
  `@sousa99/homesweethome-components`, matching the declared-identity convention.
- A shared implementation satisfies FR-011 (identical by construction) and the user's
  Q2 answer: one status bar, reused everywhere.

**Alternatives considered**:
- A per-module duplicate status bar — rejected: FR-004/SC-005 require identical wording
  and layout with no per-module deviations; duplication invites drift and contradicts Q2.
- A new `modules/` feature module — rejected: the bar is not a standalone, independently
  deployable feature module; the constitution's module-first principle governs capabilities,
  and internal shared libraries live under `packages/` (precedent: `packages/config`).

---

## 2. Versioning & publishing of the shared package

**Decision**: The shared package is `private: true`, `version: 0.0.1` (the workspace
version, consistent with "every package starts at 0.0.1"), is **not** added to
`.changeset/config.json` fixed groups, has no `publishConfig`, and is never published. Its
code ships to consumers **bundled inside** each module's published `dist-lib`. A change to
the shared package is released by bumping the consuming modules via their normal changesets.

**Rationale**: This is the user's explicit direction ("does not need versioning or
publishing, we just use the workspace version and publish through the already developed
components"). It also matches the constitution's per-module independent releases: only
modules are versioned/published, and the shared code rides along inside them.

**Mechanism**:
- Each module lists the shared package as a **`devDependency`** (`"workspace:*"`), not a
  runtime `dependency` — pnpm links it for dev/build, and it is never advertised to
  consumers as an installable dependency of the published package.
- Each module's `vite.lib.config.ts` `rollupOptions.external` list does NOT include the
  shared package, so Vite/Rollup **bundles** it into `dist-lib/index.js` alongside the
  module's own code. Downstream consumers import `@sousa99/<slug>-components` and get the
  status bar with no extra install.
- `pnpm publish` ships only `files: ["dist-lib"]`, so the internal package is absent from
  the published artifact graph.

**Alternatives considered**:
- Listing it as a runtime `dependency` — rejected: the published package.json would
  advertise `@sousa99/homesweethome-components` as installable, which is exactly what the
  user said must not happen (it is not published).
- Keeping it external and publishing it — rejected outright by the user's direction.

---

## 3. Tailwind CSS v4 coverage for the shared component

**Decision**: Each consuming module adds an explicit `@source` directive in its
`src/index.css` pointing at the shared package source, e.g.
`@source "../../../packages/components/src";`.

**Rationale**: Tailwind v4's automatic content detection scans the project's own source
but does not scan packages resolved through `node_modules` by default. The shared
component uses utility classes (`text-slate-600`, `border-slate-200`, `bg-primary/40`,
`animate-spin`, …) that must be present in each module's generated `styles.css` (both the
lib CSS build and the SPA build). The explicit `@source` guarantees the classes are
scanned and emitted even though the component lives in another workspace package.

**Alternatives considered**:
- Relying on the module's own source already using the same utilities — rejected as
  fragile: a shared class not used by the module's own code would be silently missing.
- The shared package shipping its own compiled CSS import — rejected: duplicates the
  modules' Tailwind v4 theming (each module defines `--color-primary` etc. locally) and
  would create two styling sources of truth.

---

## 4. Component API — controlled vs. self-fetching

**Decision**: `WidgetStatusBar` is a **controlled, presentational** component. Each widget
owns its load state and passes:

```ts
export interface WidgetStatusBarProps {
  /** Local time of the most recent successful data load; null = never loaded. */
  lastUpdatedAt: number | null;
  /** True while a load (initial or refresh) is in flight — shows the indicator. */
  updating?: boolean;
  /** Failure message to surface, or null/undefined when healthy. */
  error?: string | null;
  /** Called when the Refresh control is pressed. */
  onRefresh?: () => void;
  /** Extra classes applied to the status bar root. */
  className?: string;
}
```

**Rationale**:
- The three modules use **three different data mechanisms**: TanStack Query
  (fly-over-tracker), a hand-rolled `useEffect` loader with polling (bus-catcher
  `StopCard`), and a `useCallback`/`useRef` loader (procrastinator `TaskDeckWrapper`). A
  self-fetching shared bar would have to own all three — a large, coupling mess.
- A controlled presentational bar is trivially testable and has no knowledge of backends,
  base URLs, or query libraries — matching the existing per-module auto-refresh controls
  that stay in place (FR-009).
- Wording/layout/behavior are identical by construction because there is exactly one
  component.

**Alternatives considered**:
- A shared data-fetching hook — rejected: the three modules' fetch layers are too
  different to unify without a much larger refactor that is out of scope.
- Each widget rolling its own bar markup — rejected: contradicts FR-011/Q2.

---

## 5. Time formatting

**Decision**: A small `formatLastUpdated(timestamp: number | null): string` helper renders
the device-local time as 24-hour `HH:MM:SS` (e.g. "14:32:05"). `null` renders
"Not updated yet". The status bar renders `Last updated {time}`.

**Rationale**:
- FR-005 requires the device's local timezone; FR-007 forbids a fabricated timestamp when
  nothing has loaded.
- The existing fly-over `formatAsOf` prints a similar "as of HH:MM" using `Date` local
  time; `HH:MM:SS` adds seconds because the user wants a precise local time and the
  widgets refresh on the order of seconds.
- A pure function is unit-testable without DOM.

**Alternatives considered**:
- Relative labels ("2 min ago") — rejected: the user explicitly asked for "a local time
  saying when was last update".
- 12-hour with AM/PM — rejected for default consistency; the spec's example and the
  existing fly-over readout both use 24-hour style.

---

## 6. Last-update timestamp plumbing per widget

**Decision**:
- **fly-over-tracker** (TanStack Query): extend `useFlyOversQuery`'s result to expose
  `dataUpdatedAt: number | null` (Query's built-in timestamp of the last successful data)
  and keep `refetch`, `isFetching`, `isError`, `error`. Each of the 5 published widgets
  passes these to `WidgetStatusBar`.
- **bus-catcher `StopCard`**: extend the local `LoadState` to carry
  `lastUpdatedAt: number` on `ready` (set from `Date.now()` on each successful load);
  expose a `refresh` that re-runs the load immediately; pass `updating` from an in-flight
  flag; surface `error` from the error branch.
- **procrastinator `TaskDeckWrapper`**: extend the local load state with `lastUpdatedAt`
  on `success`; expose the existing `load` as the Refresh handler; pass an in-flight flag
  as `updating`; pass the error message on `error`.

**Rationale**: The bar is fed by each widget's real freshness signal. For TanStack Query
the canonical signal is `dataUpdatedAt`; for the two hand-rolled loaders the load state
is extended minimally rather than re-platformed.

**Alternatives considered**:
- Deriving the timestamp by storing `Date.now()` in each render — rejected: it must be
  tied to a *successful load*, not a render.
- Refactoring bus-catcher/procrastinator onto TanStack Query — rejected: large, risky
  change well beyond this feature's scope.

---

## 7. Fate of the existing per-module indicator/refresh code

**Decision**: fly-over-tracker's `UpdatingIndicator.tsx` (and its test) is removed — it is
used only by the 5 published widgets and its behavior is absorbed into `WidgetStatusBar`.
The `RefreshRateSelect` (auto-refresh) and each widget's descriptive header text remain as
component-specific content; the standardized `WidgetStatusBar` replaces the previous
count/status line and inline Refresh button. The SPA-internal `formatAsOf`/`FlyOverList`
are untouched (out of scope).

**Rationale**: Leaves no dead code behind and keeps the SPA's own layout intact. The
`UpdatingIndicator` is not part of the published surface (`index.ts`), so removing it does
not break the public API.

**Alternatives considered**:
- Keeping `UpdatingIndicator` and wrapping it — rejected: the shared bar must be the single
  source of the update indicator for identical behavior (FR-004).