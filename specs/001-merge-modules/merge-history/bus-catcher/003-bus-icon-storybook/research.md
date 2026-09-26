# Research — Bus Icon Favicon & Stop List Component Showcase (003)

**Date**: 2026-09-25

Resolves every technical unknown from the plan's Technical Context. Each entry
records the decision, rationale, and alternatives considered.

## R1: Storybook framework and addons

- **Decision**: Use `@storybook/react-vite` as the framework with
  `@storybook/addon-docs` listed explicitly in `addons`. No
  `@storybook/addon-essentials`.
- **Rationale**: Storybook 9 removed the essentials bundle (actions/controls/
  viewport/interactions moved into `storybook` core). `addon-docs` is the
  required addon for MDX + autodocs and must be registered manually — it is
  not auto-injected. The framework is mandatory since v7; no `core.builder`
  is needed because the Vite builder ships with the framework.
- **Alternatives considered**: `@storybook/addon-essentials` (removed in v9),
  `@storybook/blocks` import path (package consolidated into
  `@storybook/addon-docs` — no longer published).
- **Source**: storybook.js.org/docs/9/migration-guide, /docs/9/writing-docs/mdx

## R2: Tailwind CSS v4 in Storybook

- **Decision**: Register the `@tailwindcss/vite` plugin in a `viteFinal` hook
  inside `.storybook/main.ts`, using a dynamic `await import()`; and import
  `../src/index.css` in `.storybook/preview.ts`.
- **Rationale**: The Storybook Vite builder normally auto-merges the app's
  `vite.config.ts`, so `@tailwindcss/vite` should be picked up — but there are
  known failures (tailwindlabs/tailwindcss#16684, storybookjs/storybook#25256)
  where utilities are not generated inside Storybook. The `viteFinal` hook
  guarantees the plugin is applied. A top-level `import` of
  `@tailwindcss/vite` in `main.ts` fails (`ERR_PACKAGE_PATH_NOT_EXPORTED`,
  package has no CJS entry), so the import must be dynamic. Tailwind v4 needs
  its CSS entry (`@import "tailwindcss";`) processed — imported via
  `preview.ts`.
- **Alternatives considered**: relying on auto-merge alone (flaky), a
  separate Storybook CSS file (duplicates Tailwind setup).
- **Source**: storybook.js.org/docs/9/configure/styling-and-css,
  storybook.js.org/recipes/tailwindcss, tailwindlabs/tailwindcss#16684

## R3: MDX docs format (docs addon)

- **Decision**: Author `src/components/StopTimesList.mdx` importing blocks
  from `@storybook/addon-docs/blocks` (the only correct v9 import path),
  using `<Meta of={Stories} />` referencing the CSF module exports and
  `<Canvas of={Stories.Default} />` to embed interactive examples next to
  prose.
- **Rationale**: `<Canvas>` renders an interactive story with chrome directly
  beside the documentation, satisfying FR-004 / SC-003. `.mdx` is the default
  docs extension and the official stories glob includes
  `'../src/**/*.mdx'`.
- **Alternatives considered**: `@storybook/blocks` imports (invalid in v9),
  autodocs-only without MDX (no custom prose, fails FR-004).
- **Source**: storybook.js.org/docs/9/writing-docs/mdx

## R4: CSF story conventions

- **Decision**: `src/components/StopTimesList.stories.tsx` with
  `tags: ['autodocs']`, a typed meta (`satisfies Meta<typeof StopTimesList>`),
  and one `StoryObj` per state using `args`. Fixture data mirrors
  `StopTimesList.test.tsx` (same scheduled/live `Passing` shapes) so stories
  and tests agree.
- **Rationale**: autodocs remains valid in v9 via `tags`; typed `args` keep
  the component's prop contract (`{ times: Passing[] }`) enforced at authoring
  time. Reusing test fixtures prevents divergence between tests and stories.
- **Alternatives considered**: `docs: { autodocs: 'tag' }` global config
  (deprecated 8.1 form), story-only without fixtures (untyped).
- **Source**: storybook.js.org/docs/9/writing-docs/autodocs

## R5: Favicon asset location and reference

- **Decision**: Create `frontend/public/favicon.svg` and reference it from
  `frontend/index.html` with `<link rel="icon" type="image/svg+xml"
  href="/favicon.svg" />`.
- **Rationale**: Vite serves `public/` at `/` in dev and copies files verbatim
  to the root of the build output with stable, un-hashed URLs — exactly what a
  favicon needs (browsers cache favicons per hostname). React never manages
  the favicon at runtime. SVG favicons are supported by every evergreen
  browser (Safari since 16.4). A PNG fallback is not required for this
  private dashboard, but the SVG is kept simple enough to read at 16px.
- **Alternatives considered**: `src/assets` import (hashed URLs defeat
  favicon caching), inline `data:` favicon (awkward URL-encoding, complicates
  dark mode).
- **Source**: vite.dev/guide/assets#the-public-directory, caniuse
  link-icon-svg, web.dev/articles/building/an-adaptive-favicon

## R6: Bus icon source and license

- **Decision**: Use the Lucide `bus-front` icon, ISC-licensed, copied into
  `frontend/public/favicon.svg` with explicit stroke colors (Lucide's raw
  `stroke="currentColor"` renders dark/unreadable in a favicon), a 24×24
  viewBox, and an inline `@media (prefers-color-scheme: dark)` block.
- **Rationale**: `bus-front` is a chunky front-view bus that reads clearly at
  tab size (16px), unlike the thin 2px `bus` line icon which renders faint.
  ISC is permissively free to copy. Replacing `currentColor` with fixed
  colors and adding the dark-mode block avoids invisible/faint rendering;
  Safari does not honor media queries inside SVG favicons, so the light-theme
  color is chosen to read on both themes.
- **Alternatives considered**: Lucide `bus` (too thin at 16px), other icon
  sets (Licence/premium constraints).
- **Source**: raw.githubusercontent.com/lucide-icons/lucide/main/icons/bus-front.svg,
  lucide.dev/icons/bus-front, github.com/lucide-icons/lucide/blob/main/LICENSE