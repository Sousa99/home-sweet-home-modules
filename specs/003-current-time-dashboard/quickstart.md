# Quickstart: Current Time Dashboard

**Branch**: `003-current-time-dashboard` | **Date**: 2026-09-27 | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Validation guide proving the feature works end-to-end. Contract details live in
[contracts/frontend-api.md](contracts/frontend-api.md); data details in [data-model.md](data-model.md).
Implementation is tracked in `tasks.md`.

## Prerequisites

- Node 24, pnpm 11 (repo-wide), workspace installed once at the root: `pnpm install`.
- GitHub Packages registry configured for the `@sousa99` scope (workspace already set up).

## Setup

```bash
pnpm install                 # from the repo root
```

## Validate the module

Run from the repo root (workspace commands apply to every module):

```bash
pnpm --filter ./modules/current-time/frontend typecheck   # shared-preset typecheck
pnpm --filter ./modules/current-time/frontend test        # Vitest suite (test-first gate)
pnpm lint                                                  # repo-wide ESLint
pnpm format                                                # repo-wide Prettier check
```

**Expected outcomes**:

- `typecheck`: passes with zero errors under the shared `@sousa99/homesweethome-config` preset.
- `test`: all tests pass, including: the live-clock hook ticks every second and resyncs on
  visibility/focus; `formatTimeParts` produces correct 12h/24h parts with AM/PM; the two widgets
  render identical readouts (chrome differs), honor `align` (left/center/right), seed
  `defaultFormat`, and behave correctly with `switchable` on/off (toggle hidden + format pinned when
  off; toggle shown + persisted when on); the dashboard renders the card widget.
- `lint` / `format`: clean (enforced by CI on every PR).

## Run the dashboard

```bash
pnpm --filter ./modules/current-time/frontend dev          # starts Vite dev server
```

Open the printed URL (default port `5173`). The dashboard shows the current local time as
hours : minutes : seconds, advancing each second, in the shared light amber/slate style.

**Manual validation scenarios**:

1. **Live display** — the seconds advance once per second and minutes/hours advance at boundaries;
   readout matches the device clock (spec SC-001, SC-002).
2. **Offline** — with network disabled, the dashboard still shows the correct time (spec SC-003).
3. **Format toggle** — switch 12h ⇄ 24h; the readout updates immediately and AM/PM appears in
   12-hour mode (spec FR-007, SC-005). Reload — the choice is remembered (spec FR-008).
4. **Resync** — leave the tab backgrounded for a while, return; the readout is immediately correct.
5. **Responsive** — resize to a mobile viewport; the layout stays coherent (spec FR-006, SC-004).
6. **Shared style** — compare against another module's page; same light palette, white cards,
   amber accents (spec FR-015).

## Run the component workbench (Storybook)

```bash
pnpm --filter ./modules/current-time/frontend storybook     # workbench on :6006
```

**Expected**: `Clock.mdx` documentation page for `ClockCard`/`ClockPlain`; previews for both widgets
across align × defaultFormat × switchable; `DashboardPage` preview (spec FR-014, SC-009).

## Embed the widgets (publishing surface)

The published widgets accept identical props:

- `ClockCard` — card chrome (white rounded card, amber border) wrapping the live readout.
- `ClockPlain` — same readout, no card chrome.
- Shared props: `align` (`left`|`center`|`right`, default `center`), `defaultFormat`
  (`'12h'`|`'24h'`, default `'24h'`), `switchable` (boolean, default `true`), `aspectRatio`
  (optional CSS ratio like `'16/9'`/`'1/1'`, no default).

**Manual validation**: render each widget inside an arbitrary container card; set each prop and
verify the readout aligns, the default format is honored, and `switchable={false}` hides the toggle
while `switchable={true}` shows and persists it. Resize the container and confirm the widget fills
the available width/height with the readout scaling to fit; set `aspectRatio` and confirm the
proportions are kept without overflow (spec FR-010…FR-013, FR-016, FR-017, SC-006…SC-008, SC-010).

## Build

```bash
pnpm --filter ./modules/current-time/frontend build         # tsc --noEmit + app build (dist-app)
pnpm --filter ./modules/current-time/frontend build:lib     # library build (dist-lib) for publishing
pnpm --filter ./modules/current-time/frontend build-storybook # storybook build (dist-storybook)
```

**Expected outcomes**: all three builds succeed; `dist-app/` contains the runnable SPA, `dist-lib/`
the publishable package matching the [frontend-api contract](contracts/frontend-api.md), and
`dist-storybook/` the static workbench.

## Notes

- No backend, database, or network service is required anywhere in this flow.
- Versioning is independent per module: this module forms its own changesets fixed group, starts at
  `0.0.1`, and releases do not touch other modules.