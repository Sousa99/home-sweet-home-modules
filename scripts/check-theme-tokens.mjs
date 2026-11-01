#!/usr/bin/env node
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const DIRS = ['packages/components/src', 'modules'];

const PALETTE_UTILITY =
  /\b(?:bg|text|border|ring|outline|fill|stroke|from|via|to|shadow|divide|placeholder|decoration|accent|caret)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black|primary)(?:-\d{2,3})?(?:\/\d{1,3})?\b/g;

const ROUNDED = /(?<![\w-])rounded(?:-(?:sm|md|lg|xl|2xl|3xl))?(?![\w-])/g;
const RAW_COLOR = /#[0-9a-fA-F]{3,8}\b|(?<![\w-])(?:rgb|hsl|oklch)\(/g;
const ALLOWED_ROUNDED = new Set(['rounded-full']);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'dist-lib')
      continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, files);
    else if (
      entry.isFile() &&
      entry.name.endsWith('.tsx') &&
      !entry.name.includes('.test.') &&
      !entry.name.includes('.stories.')
    ) {
      files.push(path);
    }
  }
  return files;
}

function isAllowedRounded(value) {
  return ALLOWED_ROUNDED.has(`rounded-${value}`);
}

const violations = [];

for (const dir of DIRS) {
  for (const file of walk(join(ROOT, dir))) {
    const source = readFileSync(file, 'utf8');
    source.split('\n').forEach((line, index) => {
      for (const match of line.matchAll(PALETTE_UTILITY)) {
        violations.push({
          file: relative(ROOT, file),
          line: index + 1,
          value: match[0],
          rule: 'raw palette utility',
        });
      }
      for (const match of line.matchAll(ROUNDED)) {
        const value = match[0].replace(/^rounded-/, '');
        if (!isAllowedRounded(value)) {
          violations.push({
            file: relative(ROOT, file),
            line: index + 1,
            value: match[0],
            rule: 'non-brutalist radius',
          });
        }
      }
      for (const match of line.matchAll(RAW_COLOR)) {
        violations.push({
          file: relative(ROOT, file),
          line: index + 1,
          value: match[0],
          rule: 'raw color literal',
        });
      }
    });
  }
}

if (violations.length > 0) {
  console.error(`Theme guard failed with ${violations.length} violation(s):\n`);
  for (const violation of violations) {
    console.error(`  ${violation.file}:${violation.line}  ${violation.value}  (${violation.rule})`);
  }
  console.error('\nUse semantic tokens instead (see docs/theme.md).');
  process.exit(1);
}

console.log('Theme guard passed: no raw palette utilities, radii, or color literals.');
