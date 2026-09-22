import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/** The frontend package root (vitest runs with the package directory as cwd). */
const FRONTEND_ROOT = resolve(process.cwd());

describe('favicon', () => {
  it('is referenced from index.html', () => {
    const html = readFileSync(resolve(FRONTEND_ROOT, 'index.html'), 'utf8');
    expect(html).toContain('<link rel="icon"');
    expect(html).toMatch(/href="\/favicon\.svg"/);
  });

  it('ships a favicon.svg asset', () => {
    expect(existsSync(resolve(FRONTEND_ROOT, 'public', 'favicon.svg'))).toBe(true);
  });
});
