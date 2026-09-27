# Current Time — Setup

A frontend-only module that shows the current local time (hours, minutes, seconds) in a
dashboard-style page using the shared light amber/slate style. No backend, database, or network
service is involved.

## Prerequisites

- Node 24 and pnpm 11 (repository-wide toolchain)
- Workspace installed once from the repo root: `pnpm install`

## Run the dashboard

```bash
# from the repository root
pnpm --filter ./modules/current-time/frontend dev
```

Open the printed URL (default `http://localhost:5173`). The page shows the live time with
seconds advancing every second. Use the 24h/12h toggle; the choice is remembered for next time.

## Component workbench (Storybook)

```bash
pnpm --filter ./modules/current-time/frontend storybook
```

Open the printed URL (default `http://localhost:6006`). Browse the `ClockCard`/`ClockPlain`
previews (align × defaultFormat × switchable × aspectRatio) and the `Clock.mdx` docs page.

## Quality gates

```bash
pnpm --filter ./modules/current-time/frontend test        # Vitest (test-first suite)
pnpm --filter ./modules/current-time/frontend typecheck   # TypeScript
pnpm --filter ./modules/current-time/frontend build       # SPA build -> dist-app/
pnpm --filter ./modules/current-time/frontend build:lib   # library build -> dist-lib/ (publishable)
pnpm --filter ./modules/current-time/frontend build-storybook # static workbench -> dist-storybook/
```

The repository-wide `pnpm lint`, `pnpm format`, `pnpm typecheck`, and `pnpm test` also cover
this module via the shared workspace scripts.

## Manual validation

1. Seconds advance once per second; minutes/hours advance at boundaries.
2. Disable the network — the dashboard still shows the correct time (no requests are made).
3. Toggle 12h ⇄ 24h — the readout updates immediately (AM/PM appears in 12-hour mode).
4. Reload — the chosen format is remembered.
5. Leave the tab backgrounded for a while, return — the readout is immediately correct.
6. Resize to a mobile viewport — the layout stays coherent and the time fully visible.
7. In the workbench, embed `ClockCard`/`ClockPlain` in a container and resize it — the widget
   fills the space and the readout scales to fit; setting `aspectRatio` constrains its proportions.

## Embedding the widgets

`ClockCard` and `ClockPlain` accept the same props: `align` (`left`|`center`|`right`, default
`center`), `defaultFormat` (`'12h'`|`'24h'`, default `'24h'`), `switchable` (boolean, default
`true`), and `aspectRatio` (optional CSS ratio like `'16/9'`). Place them in a container that gives
them size (e.g. `h-40 w-96`); the readout scales to fit.

## Project layout

```text
frontend/
├── src/
│   ├── components/
│   │   ├── ui/              Card primitives (shared light style)
│   │   └── clock/           ClockCard, ClockPlain, ClockWidget (internal core), ClockFace,
│   │                        TimeFormatToggle, stories + Clock.mdx docs
│   ├── lib/                 useCurrentTime (live ticking), timeFormat (formatting + persistence),
│   │                        useClockFormat (widget format state), utils (cn)
│   ├── pages/               DashboardPage
│   └── index.ts             library entry (published surface)
├── .storybook/              Storybook config (addon-docs, Tailwind)
├── tests/                   Vitest + Testing Library
├── vite.config.ts           app build (dist-app)
└── vite.lib.config.ts       library build (dist-lib)
```

## Troubleshooting

- **Port already in use**: Vite picks the next free port automatically; use the printed URL.
- **A stale 12/24h choice looks wrong**: clear the site's local storage (the key is
  `current-time:time-format`); an invalid value falls back to 24-hour automatically.
- **Typecheck/lint failures**: run `pnpm format:write` then `pnpm --filter ./modules/current-time/frontend typecheck`.

## Versioning & releases

The package `@sousa99/current-time-components` releases independently (its own changesets fixed
group) and starts at `0.0.1`. See the repository root `AGENTS.md` for the release workflow.