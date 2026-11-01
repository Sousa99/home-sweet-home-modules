# @sousa99/homesweethome-theme

Shared neo-brutalist light/dark design tokens for the Home Sweet Home dashboard and module widgets.

```css
@import 'tailwindcss';
@import '@sousa99/homesweethome-theme/theme.css';
```

Set `data-theme="light"` or `data-theme="dark"` on `<html>`. With no attribute the light identity
applies. Tokens are exposed as semantic utilities (`bg-surface`, `text-ink`, `text-accent`,
`border-outline`, `text-ok`, …) plus `border-brutal`, `rounded-brutal`, and `shadow-brutal`.

See `docs/theme.md` in the repository for the consumption rules and `theme.css` for the values.
