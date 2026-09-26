# Bug Verification: Line-filter selection breaks for bidirectional stops

- **Slug**: line-filter-duplicates
- **Tested**: 2026-09-25
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

The original symptoms — a line served in both directions rendering twice and
toggling itself off (so the intended filter could not be saved) — no longer
reproduce. A stop with two routes sharing a short name now yields a single
filter button that stays selected and saves `lineFilter: ["736"]` once, and a
failed save surfaces an inline error. Full regression suite and quality gates
pass. Live-browser reproduction was not run (needs a populated schedule DB and
running servers); its automated equivalent in jsdom was exercised instead.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix, automated) | `vitest run src/components/ConfigPanel.test.tsx` — `dedupes lines sharing a short name (bidirectional stops)` | pass | Replicates assessment steps 1–4 in jsdom: one "736" button, stays selected, saves `['736']` once; would fail on the pre-fix toggle-off behavior |
| New / updated tests | `vitest run src/providers/carris-metropolitana/queries.test.ts` (15 tests) + `ConfigPanel.test.tsx` (10 tests) | pass | Includes the new `servingLines` dedupe test and the two new ConfigPanel tests |
| Reproduction (live SPA) | manual UI with running backend | skipped | Requires `pnpm --filter ./backend ingest` (populated DB) + dev servers + live CM feed; not run in this environment |
| Regression suite | `pnpm test` | pass | backend 122/122, frontend 31/31 |
| Lint | `pnpm lint` | pass | `eslint .` clean |
| Format | `pnpm format` | pass | All files formatted |
| Type-check | `pnpm typecheck` | pass | backend + frontend clean |
| Scaffold drift | `node scripts/scaffold.mjs --check` | pass | no drift |

## Output Excerpts

```
✓ ConfigPanel > dedupes lines sharing a short name (bidirectional stops)
✓ ConfigPanel > shows an inline error when saving a duplicate stop fails
Test Files  1 passed (1)   Tests  10 passed (10)

✓ src/providers/carris-metropolitana/queries.test.ts (15 tests)
Test Files  1 passed (1)   Tests  15 passed (15)

frontend test:  Tests  31 passed (31)
backend test:   Tests  122 passed (122)
eslint .  → clean
All matched files use Prettier code style!
tsc --noEmit → Done (backend + frontend)
scaffold.mjs --check → OK
```

## Residual Risks

- Live-browser E2E not exercised (needs a populated schedule DB and running
  REST + SPA); the component test covers the exact interaction path in jsdom,
  and the backend `servingLines` dedupe is covered by a fixture-based query
  test that mirrors real CM bidirectional data.
- `servingLines` grouping by `shortName` returns an arbitrary route `id` per
  line; harmless for current consumers (UI filters by `shortName`), worth
  remembering if per-direction display is ever added.

## Recommendation

Close the bug — verified. The reported symptom is resolved at the component
and data seams, all new regression tests pass, and no regressions were found.
If a full browser pass is desired before closing, run the SPA against an
ingested backend and repeat the assessment's steps 1–4.