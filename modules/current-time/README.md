# Current Time

[![Part of Home Sweet Home](https://img.shields.io/badge/Home%20Sweet%20Home-Module-blue)](https://github.com/)

A frontend-only Home Sweet Home module: a clean, dashboard-style current-time display showing
hours, minutes, and seconds that tick live, works fully offline, and remembers your preferred
12/24-hour format. It follows the shared light amber/slate visual language of the other modules
and ships two embeddable clock widgets (`ClockCard` and `ClockPlain`) that fill the available space
and scale the readout to fit.

## 🧰 Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vite, React 19, Tailwind CSS v4, React Router, Lucide icons |
| Tooling | pnpm 11, TypeScript, ESLint (flat config), Prettier, Vitest, Testing Library |

The module is intentionally frontend-only: no backend service, no database, no network calls.
Time comes from the device clock; the only persisted data is the 12/24-hour format preference,
kept in the browser's local storage.

## ✨ Features

- Live hours : minutes : seconds readout, updating every second
- Self-correcting display — resyncs on reload, tab refocus, and visibility changes (no drift)
- 12-hour and 24-hour format toggle (default 24-hour), remembered across visits
- Two embeddable widgets — `ClockCard` (card chrome) and `ClockPlain` (none) — with identical
  props: `align`, `defaultFormat`, `switchable`, and optional `aspectRatio`; they fill the
  available width/height and scale the readout to fit
- Responsive dashboard layout, readable on desktop and mobile, works offline
- Storybook workbench with a written `.mdx` docs page for the widgets

## 🧰 Prerequisites

- Node 24, pnpm 11 (see the repository root `AGENTS.md` / `setup.md`)

## 🚀 Getting Started

From the repository root:

```bash
pnpm install                                              # install the whole workspace
pnpm --filter ./modules/current-time/frontend dev         # run the SPA dev server (default :5173)
pnpm --filter ./modules/current-time/frontend storybook   # component workbench (default :6006)
```

## 🧪 Quality Gates

```bash
pnpm --filter ./modules/current-time/frontend test        # Vitest suite
pnpm --filter ./modules/current-time/frontend typecheck   # tsc --noEmit
pnpm --filter ./modules/current-time/frontend build       # app build (dist-app)
pnpm --filter ./modules/current-time/frontend build:lib   # publishable library build (dist-lib)
pnpm --filter ./modules/current-time/frontend build-storybook # static workbench (dist-storybook)
```

The module extends the shared presets from `@sousa99/homesweethome-config`, so the repository-wide
`pnpm lint`, `pnpm format`, `pnpm typecheck`, and `pnpm test` cover it too.

## 📦 Package

| Package | Registry | Purpose |
|---------|----------|---------|
| `@sousa99/current-time-components` | GitHub Packages (`npm.pkg.github.com`) | SPA + publishable components library |

The public surface is `ClockCard`, `ClockPlain`, `ClockFace`, `TimeFormatToggle`, `DashboardPage`,
`useCurrentTime`, `formatTimeParts`, `getTimeFormat`, and `setTimeFormat`, plus the types
`TimeFormat`, `TimeParts`, `ClockCardProps`, `ClockPlainProps`, `ClockFaceProps`, and
`TimeFormatToggleProps` (see the feature contracts under
`specs/003-current-time-dashboard/contracts/frontend-api.md`). Releases are independent via its own
changesets fixed group, starting at `0.0.1`.

### Embedding the widgets

```tsx
import '@sousa99/current-time-components/styles.css';
import { ClockCard } from '@sousa99/current-time-components';

function Dashboard() {
  return (
    <div className="h-40 w-96">
      <ClockCard align="center" defaultFormat="24h" switchable />
    </div>
  );
}
```

Give the widget a container with explicit size — it fills the space and scales the readout to fit;
an optional `aspectRatio` prop (e.g. `'16/9'`, `'1/1'`) constrains its proportions when one axis is
free.

## 📚 Learn More

- Repository layout, conventions, and delegation: root `AGENTS.md`
- Module-specific run commands and troubleshooting: [`setup.md`](setup.md)
- Module guidance for contributors: [`AGENTS.md`](AGENTS.md)