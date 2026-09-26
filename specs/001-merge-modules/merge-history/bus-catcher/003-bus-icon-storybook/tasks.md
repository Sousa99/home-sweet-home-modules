---

description: "Task list for bus icon favicon & stop card widget showcase"
---

# Tasks: Bus Icon Favicon & Stop Card Widget Showcase

**Input**: Design documents from `/specs/003-bus-icon-storybook/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: The widget adds fetch-lifecycle runtime logic, covered by
`frontend/src/components/StopCard.test.tsx` (loading/ready/error/missing,
polling, custom fetcher) plus the existing component and Dashboard tests.

**Note**: the exposed component is a self-fetching **widget** — it displays
the waiting times for a given stop and a set of buses — showcased in
Storybook and published through the package. The inner list is a private
building block.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the Storybook + package toolchain is ready.

- [x] T001 Verify the Storybook toolchain is present in
      `frontend/package.json` — `storybook`, `@storybook/react-vite`,
      `@storybook/addon-docs` in devDependencies and the `storybook` /
      `build-storybook` scripts exist; confirm `pnpm install` is current.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Storybook configuration that MUST be complete before the showcase
(US1) and its docs page (US3) can render anything.

**⚠️ CRITICAL**: No user story work involving Storybook can begin until this
phase is complete.

- [x] T002 [P] Create `frontend/.storybook/main.ts` — `framework:
      '@storybook/react-vite'`, `addons: ['@storybook/addon-docs']`, stories
      globs `'../src/**/*.mdx'` and
      `'../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'`, and a `viteFinal` hook
      that merges the `@tailwindcss/vite` plugin via dynamic
      `await import('@tailwindcss/vite')` (top-level import fails with
      `ERR_PACKAGE_PATH_NOT_EXPORTED` — research R2). `satisfies
      StorybookConfig` from `@storybook/react-vite`.
- [x] T003 [P] Create `frontend/.storybook/preview.ts` — `import
      '../src/index.css';` (required for Tailwind v4 utility generation) and
      export a `Preview` with `tags: ['autodocs']` (research R2/R4).

**Checkpoint**: Foundation ready — `pnpm --filter ./frontend
build-storybook` loads the config without errors. A "no stories found"
warning is acceptable at this stage (stories land in US1); any config or
plugin error is a blocker.

---

## Phase 3: User Story 1 - Browse the stop card widget in an isolated showcase + package (Priority: P1) 🎯 MVP

**Goal**: The self-fetching `StopCard` widget the dashboard renders for each
configured stop is extracted, rendered per state in Storybook, and published
through the `@sousa99/bus-catcher-components` package.

**Independent Test**: Run `pnpm --filter ./frontend storybook`, open the
**StopCard** stories, and confirm each of **Default** / **ScheduleOnly** /
**Empty** / **Loading** / **Error** / **Missing** renders offline (each story
uses a static `fetchTimes` fixture) with Tailwind styling. Then run `pnpm
--filter ./frontend build:lib` and confirm `dist-lib/index.d.ts` exports
`StopCard` + its types.

### Implementation for User Story 1

- [x] T004 [US1] Extract a self-fetching `StopCard` widget in
      `frontend/src/components/StopCard.tsx` — props `stopId`, `stopName`,
      `lines`, `limit`, `refetchIntervalMs`, `fetchTimes`, `missing`; it
      fetches `StopTimesResponse` itself, polls on the interval, and renders
      the header (stop name + optional line badge) and body (inner
      `StopTimesList`, `StopCoverage`, and loading/error/missing placeholders)
      per `contracts/stop-card.md` (FR-010).
- [x] T005 [US1] Add `frontend/src/components/StopCard.test.tsx` covering the
      fetch lifecycle — default fetcher args, live/schedule rendering,
      coverage notice, error, missing (no fetch), custom `fetchTimes`, and
      polling on the interval (constitution IV — test-first).
- [x] T006 [US1] Refactor `frontend/src/pages/Dashboard.tsx` to render the
      `<StopCard>` widget per configured stop (stopId/stopName/lines/missing);
      fetching is now internal to the widget.
- [x] T007 [US1] Create the package entry `frontend/src/index.ts` re-exporting
      `StopCard`, `StopCardProps`, `FetchStopTimes`, `Passing`,
      `RealtimeInfo`, and `StopTimesResponse` (the entry
      `vite.lib.config.ts` already expects).
- [x] T008 [US1] Install `@microsoft/api-extractor` as a frontend devDependency
      (added to `frontend/package.json.tpl`, then re-rendered via
      `node scripts/scaffold.mjs`) so `build:lib`'s `vite-plugin-dts`
      `bundleTypes` bundling succeeds (was failing with "Install it before
      enabling bundleTypes").
- [x] T009 [US1] Create `frontend/src/components/StopCard.stories.tsx` — CSF
      with a typed meta (`satisfies Meta<typeof StopCard>`),
      `tags: ['autodocs']`, and six `StoryObj` stories with typed `args` and
      module-level `fetchTimes` fixtures: **Default** (mixed live +
      scheduled, live realtime, line filter), **ScheduleOnly**, **Empty**,
      **Loading** (never-resolving fixture), **Error** (rejecting fixture),
      **Missing** (`missing: true`, no fetch). The import MUST be the single
      shared `./StopCard` (FR-002 / SC-004 — no copy).

**Checkpoint**: At this point, User Story 1 is fully functional and testable
independently — all six stories render with correct pills and Tailwind
styles, `pnpm --filter ./frontend test` passes the widget tests, and
`build:lib` publishes `StopCard`.

---

## Phase 4: User Story 2 - See a bus icon in the browser tab (Priority: P1)

**Goal**: The SPA shows a bus-front icon in the browser tab instead of the
default blank page icon.

**Independent Test**: Run `pnpm --filter ./frontend dev`, open
http://localhost:5173, and confirm the tab shows the bus-front icon; zoom the
tab small and toggle OS dark mode — the icon stays legible (FR-007).

### Implementation for User Story 2

- [x] T010 [P] [US2] Create `frontend/public/favicon.svg` — Lucide
      `bus-front` icon (ISC; path data from
      `raw.githubusercontent.com/lucide-icons/lucide/main/icons/bus-front.svg`),
      self-contained (~1KB), 24×24 `viewBox`, explicit stroke colors
      replacing `currentColor` (light-theme color chosen to also read on
      dark, since Safari ignores media queries in SVG favicons — research
      R6), no scripts/animation/external resources.
- [x] T011 [US2] Add the favicon link to `frontend/index.html`:
      `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />` in the
      `<head>` (contract `contracts/stop-card.md`, research R5).
      Depends on T010.

**Checkpoint**: At this point, User Story 2 works independently — the SPA tab
shows the bus icon.

---

## Phase 5: User Story 3 - Read documentation next to a live example (Priority: P2)

**Goal**: The **StopCard → Docs** page shows written documentation (purpose,
props, states) and a readable **Controls** props table alongside an
interactive `<Canvas>` for each story on one page.

**Independent Test**: In the running Storybook, open **StopCard → Docs** and
confirm prose, a Controls table listing the widget's props, and an
interactive canvas for each story are all visible (FR-003, FR-004, FR-005,
SC-003).

### Implementation for User Story 3

- [x] T012 [US3] Create `frontend/src/components/StopCard.mdx` — import
      `{ Canvas, Controls, Meta }` from `@storybook/addon-docs/blocks` (the
      only valid v9 path — research R3); `<Meta of={Stories} />` bound to the
      CSF module exports from `./StopCard.stories`; `<Controls
      of={StopCardStories.Default} />` for a readable props table; prose for
      purpose, props, and states; and a `<Canvas of={...}>` for **Default**,
      **ScheduleOnly**, **Empty**, **Loading**, **Error**, and **Missing**;
      remove the superseded `StopTimesList.stories.tsx` / `StopTimesList.mdx`.
      Depends on T009.

**Checkpoint**: At this point, User Stories 1, 2, AND 3 are all independently
functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validation and quality gates across all user stories.

- [x] T013 [P] Run the `quickstart.md` validation end-to-end: `pnpm
      --filter ./frontend storybook` (Docs page renders), `pnpm --filter
      ./frontend build-storybook` (Docs included, no errors), the SPA
      favicon check via `pnpm --filter ./frontend dev`, and `pnpm --filter
      ./frontend build:lib` (package exports `StopCard`).
- [x] T014 [P] Run all quality gates and confirm no regressions:
      `pnpm lint && pnpm format && pnpm test && pnpm typecheck`, `node
      scripts/scaffold.mjs --check`, and `pnpm --filter ./frontend build` to
      prove the SPA runtime bundle is unaffected by Storybook (storybook is
      dev-only, never in the app bundle).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS US1 and US3.
- **User Story 1 (US1)**: Depends on Foundational — no dependency on US2/US3.
- **User Story 2 (US2)**: No dependency on Storybook or other stories — can
  start immediately after Setup (independent files: `public/`, `index.html`).
- **User Story 3 (US3)**: Depends on Foundational AND US1's stories (the MDX
  `<Canvas>` references the CSF stories).
- **Polish (Final Phase)**: Depends on all desired user stories.

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Foundational (Phase 2); no deps on other stories.
- **User Story 2 (P1)**: Starts after Setup (Phase 1); fully independent of US1/US3.
- **User Story 3 (P2)**: Starts after Foundational and US1; depends on the CSF stories from T009.

### Within Each User Story

- Widget before its consumers (StopCard before the Dashboard refactor and
  before the stories/MDX); tests before the widget logic (TDD); package entry
  after the component; CSF stories before the MDX docs page.

### Parallel Opportunities

- T002 and T003 (Foundational) are different files — can run in parallel.
- US2 (T010, T011) touches only `frontend/public/` and `frontend/index.html`
  — can run in parallel with US1 and US3.
- Within US1, T004 (widget) precedes T005 (tests) / T006 / T007 / T009;
  T008 (dep install) is independent.
- T013 and T014 (Polish) can run in parallel.

---

## Parallel Example: User Story 2 with the Showcase

```bash
# Launch the favicon and the widget together (different files):
Task: "T004 [US1] Extract self-fetching StopCard widget in frontend/src/components/StopCard.tsx"
Task: "T010 [P] [US2] Create frontend/public/favicon.svg"
```

```bash
# Then, independently:
Task: "T011 [US2] Add favicon link to frontend/index.html"
Task: "T009 [US1] Create frontend/src/components/StopCard.stories.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (Storybook config — blocks the showcase).
3. Complete Phase 3: User Story 1 (widget + tests, showcase stories, package
   export).
4. **STOP and VALIDATE**: Open Storybook and confirm the six states render
   offline with Tailwind styles; run `build:lib` and confirm `StopCard` is
   exported.
5. Deploy/demo if ready.

### Incremental Delivery

1. Complete Setup + Foundational → Storybook boots cleanly.
2. Add User Story 1 → widget extracted, stories render per state, package
   exports it (MVP).
3. Add User Story 2 → bus favicon in the SPA tab (independent increment).
4. Add User Story 3 → documented Docs page with canvases + Controls.
5. Each story adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together.
2. Once Foundational is done:
   - Developer A: User Story 1 (StopCard widget + stories + package).
   - Developer B: User Story 2 (favicon) — fully independent.
3. After US1: Developer A continues with User Story 3 (MDX docs).

---

## Notes

- [P] tasks = different files, no dependencies.
- [Story] label maps task to specific user story for traceability.
- Each user story is independently completable and testable.
- The exposed component is the self-fetching stop card **widget**; the inner
  list is a private building block (FR-009, FR-010).
- Widget fetch-lifecycle logic is covered by `StopCard.test.tsx` (constitution
  IV — test-first).
- Verify `build-storybook` and `build:lib` succeed before merge.
- Commit after each task or logical group.
- Avoid: vague tasks, same-file conflicts, cross-story dependencies that
  break independence.