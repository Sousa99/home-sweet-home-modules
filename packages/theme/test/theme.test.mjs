import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const css = readFileSync(fileURLToPath(new URL('../theme.css', import.meta.url)), 'utf8');

const REQUIRED_TOKENS = [
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
  'radius',
  'border-width',
  'shadow-offset',
  'font-display',
  'font-body',
];

function block(selectorStart) {
  const start = css.indexOf(selectorStart);
  if (start === -1) throw new Error(`Missing selector: ${selectorStart}`);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return css.slice(open + 1, close);
}

function parseVars(source) {
  const vars = {};
  for (const match of source.matchAll(/--hsh-([a-z-]+):\s*([^;]+);/g)) {
    vars[match[1]] = match[2].trim();
  }
  return vars;
}

const light = parseVars(block(':root,'));
const dark = parseVars(block("[data-theme='dark']"));

function channel(value) {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) throw new Error(`Not a 6-digit hex: ${hex}`);
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const TEXT_PAIRS = [
  ['ink', 'bg'],
  ['ink', 'surface'],
  ['ink-muted', 'surface'],
  ['accent-ink', 'accent'],
  ['ok', 'surface'],
  ['warn', 'surface'],
  ['error', 'surface'],
  ['info', 'surface'],
];

const UI_PAIRS = [
  ['outline', 'surface'],
  ['outline', 'bg'],
];

describe.each([
  ['light', light],
  ['dark', dark],
])('%s appearance tokens', (_name, tokens) => {
  it('defines every required token', () => {
    for (const token of REQUIRED_TOKENS) {
      expect(tokens[token], `--hsh-${token}`).toBeDefined();
    }
  });

  it('uses the neo-brutalist shape contract', () => {
    expect(tokens.radius).toBe('0px');
    expect(tokens['border-width']).toBe('0.1875rem');
    expect(tokens['shadow-offset']).toBe('0.375rem');
    expect(tokens['font-display']).toContain('ui-sans-serif');
    expect(tokens['font-body']).toContain('ui-sans-serif');
  });

  it('has exactly one accent token', () => {
    expect(tokens.accent).toMatch(/^#[0-9a-f]{6}$/i);
    expect(
      Object.keys(tokens).filter((key) => key.startsWith('accent') && key !== 'accent-ink'),
    ).toEqual(['accent']);
  });

  it('meets text contrast thresholds', () => {
    for (const [fg, bg] of TEXT_PAIRS) {
      expect(contrast(tokens[fg], tokens[bg]), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('meets non-text contrast thresholds', () => {
    for (const [fg, bg] of UI_PAIRS) {
      expect(contrast(tokens[fg], tokens[bg]), `${fg} on ${bg}`).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('appearance selectors', () => {
  it('declares color-scheme for both appearances', () => {
    expect(block(':root,')).toContain('color-scheme: light');
    expect(block("[data-theme='dark']")).toContain('color-scheme: dark');
  });

  it('keeps the light identity as the no-attribute default', () => {
    expect(css).toContain(":root,\n[data-theme='light']");
  });
});
