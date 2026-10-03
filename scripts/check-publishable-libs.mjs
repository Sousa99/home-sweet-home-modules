#!/usr/bin/env node
/**
 * Verify that every publishable component library ships its built `dist-lib`
 * output before release. Guards against the empty-publish failure mode where
 * `pnpm changeset publish` runs without `pnpm -r build:lib` first, producing
 * tarballs that contain only `package.json`.
 *
 * A package is considered publishable when its manifest references `./dist-lib/`
 * files (via `main`/`module`/`types` or `exports`). Every referenced file must
 * exist after the build, or the check fails (release-blocker).
 *
 * Run after `pnpm -r build:lib`, e.g. in CI:
 *   node scripts/check-publishable-libs.mjs
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { globSync } from 'node:fs';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function collectDistLibRefs(manifest) {
  const refs = new Set();
  const add = (value) => {
    if (typeof value === 'string' && value.startsWith('./dist-lib/')) refs.add(value);
  };
  add(manifest.main);
  add(manifest.module);
  add(manifest.types);
  for (const target of Object.values(manifest.exports ?? {})) {
    if (typeof target === 'string') add(target);
    else for (const value of Object.values(target)) add(value);
  }
  return refs;
}

const manifests = globSync('modules/*/frontend/package.json', { cwd: repoRoot });
const failures = [];
const verified = [];

for (const manifestRel of manifests) {
  const manifest = JSON.parse(readFileSync(join(repoRoot, manifestRel), 'utf8'));
  const refs = collectDistLibRefs(manifest);
  if (refs.size === 0) continue;

  const pkgDir = join(repoRoot, dirname(manifestRel));
  const missing = [...refs].filter((ref) => !existsSync(join(pkgDir, ref)));
  verified.push(manifest.name);

  if (missing.length > 0) {
    failures.push(`${manifest.name}: missing ${missing.join(', ')}`);
  }
}

if (verified.length === 0) {
  console.error(
    'No publishable dist-lib packages found — expected the module component libraries.',
  );
  process.exit(1);
}

console.log(`Verified ${verified.length} publishable package(s):`);
for (const name of verified) console.log(`  ✓ ${name}`);

if (failures.length > 0) {
  console.error('\nPublishable package(s) are missing their built dist-lib output:');
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  console.error(
    '\nRun `pnpm -r build:lib` before publishing; empty dist-lib tarballs are a release-blocker.',
  );
  process.exit(1);
}

console.log('\nAll publishable libraries contain their dist-lib output.');
