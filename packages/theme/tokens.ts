/**
 * Token names shared by the dashboard and every Home Sweet Home widget.
 *
 * The values live in `theme.css` (the single source of truth). This module only
 * exposes the contract so tests, docs, and tooling can refer to token names
 * without duplicating values.
 */
export const THEME_STORAGE_KEY = 'hsh.dashboard.theme';

export const LIGHT_SELECTOR = ":root, [data-theme='light']";
export const DARK_SELECTOR = "[data-theme='dark']";

export const COLOR_TOKENS = [
  'bg',
  'surface',
  'surface-alt',
  'ink',
  'ink-muted',
  'accent',
  'accent-ink',
  'outline',
  'shadow-color',
  'ok',
  'warn',
  'error',
  'info',
  'map-bg',
  'map-line',
] as const;

export const SHAPE_TOKENS = ['radius', 'border-width', 'shadow-offset'] as const;

export const TYPE_TOKENS = ['font-display', 'font-body'] as const;

export const REQUIRED_TOKENS = [...COLOR_TOKENS, ...SHAPE_TOKENS, ...TYPE_TOKENS] as const;

export type ColorToken = (typeof COLOR_TOKENS)[number];
export type ShapeToken = (typeof SHAPE_TOKENS)[number];
export type TypeToken = (typeof TYPE_TOKENS)[number];
export type ThemeToken = (typeof REQUIRED_TOKENS)[number];
