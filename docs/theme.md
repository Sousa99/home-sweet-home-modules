# Shared theme

The Home Sweet Home modules and the dashboard share one visual identity through
`@sousa99/homesweethome-theme`. The package is the single source of truth for the tokens; do not copy
the token block into another package.

## Consuming the theme

Each frontend imports it after Tailwind in `src/index.css`:

```css
@import 'tailwindcss';
@import '@sousa99/homesweethome-theme/theme.css';
@source "../../../../packages/components/src";
```

`data-theme="light|dark"` on `<html>` selects the appearance. With no attribute the light identity
applies, so widgets are safe to consume before the host supports dark mode. Never add `dark:`
variants, `data-theme` attributes inside widgets, or theme props — CSS inheritance is the only
channel.

## Token roles

| Role        | Utilities                                                        |
| ----------- | ---------------------------------------------------------------- |
| Surfaces    | `bg-bg`, `bg-surface`, `bg-surface-alt`                          |
| Ink         | `text-ink`, `text-ink-muted`                                     |
| Accent      | `text-accent`, `bg-accent`, `text-accent-ink` (one per appearance) |
| Outline     | `border-outline`, `text-outline`                                 |
| Status      | `text-ok`, `text-warn`, `text-error`, `text-info`                |
| Shape       | `border-brutal`, `rounded-brutal`, `shadow-brutal`               |
| Type        | `font-display`, `font-sans`                                      |
| Components  | `.hsh-card`, `.hsh-heading`, `.hsh-label`, `.hsh-button`, `.hsh-badge`, `.hsh-focus` |

## Rules

- Square corners (0 radius), one 0.1875rem outline, one 0.375rem hard shadow.
- Flat fills only: no gradients, blur, glows, or soft shadows.
- Exactly one accent per appearance; map urgency/status to the status tokens.
- Keep behavior, labels, ARIA attributes, test IDs, and layout structure unchanged.
- Status dots may stay circular (`rounded-full`); pills and badges are square (`rounded-brutal`).

## Enforcement

`pnpm guard:theme` scans component sources for raw palette utilities, non-brutalist radii, and hex /
rgb / hsl / oklch literals. It runs in CI and release validation; the default is zero exceptions.
Storybook has an Appearance toolbar so every story can be reviewed in both modes.

See the dashboard contracts for the full token table and contrast gates:
`specs/003-dashboard-theme-refresh/contracts/` in the dashboard repository.
