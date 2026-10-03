# Bug Verification: Flaky StopCard threshold tests block the Release workflow

- **Slug**: release-pipeline-failed-2
- **Tested**: 2026-10-03
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

The flaky `StopCard` threshold assertions no longer reproduce. The two tests now wait for the
rendered `urgency-dot` inside `waitFor` instead of reading the DOM immediately after the mock call,
so `dot?.className` is never read while `undefined`. 15 consecutive executions of the previously
flaky file (180 test executions) all passed, and the full bus-catcher frontend suite, ESLint,
typecheck, and Prettier are green. No regressions found.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) | `for i in $(seq 1 15); do vitest run src/components/StopCard.test.tsx; done` | pass | 15/15 clean runs, 12 tests each (180 executions) — the original `undefined … invalid for this assertion` race did not reproduce once. |
| New / updated tests | `pnpm --filter ./modules/bus-catcher/frontend test` | pass | 10 files, 73/73 tests, incl. both updated threshold cases. |
| Regression suite | `pnpm --filter ./modules/bus-catcher/frontend test` | pass | Full frontend suite green (same run as above). |
| Lint | `pnpm --filter ./modules/bus-catcher/frontend exec eslint src/components/StopCard.test.tsx` | pass | Exit 0, no findings. |
| Type-check | `pnpm --filter ./modules/bus-catcher/frontend typecheck` | pass | `tsc --noEmit` clean. |
| Formatting | `pnpm exec prettier --check modules/bus-catcher/frontend/src/components/StopCard.test.tsx` | pass | Prettier-clean. |

## Output Excerpts

```
15 runs ×  "Tests  12 passed (12)"   ← every repeated execution of StopCard.test.tsx passed

$ pnpm --filter ./modules/bus-catcher/frontend test
 Test Files  10 passed (10)
      Tests  73 passed (73)
   Duration  2.00s

ESLINT: PASS
$ tsc --noEmit   → exit 0
All matched files use Prettier code style!
```

## Residual Risks

- **Timing flake, by nature, cannot be 100% proven absent**: 15 consecutive clean runs are strong
  evidence and the fix is structurally correct (assertion now waits for the element), but the
  definitive proof is a green CI `🧪 Test` step on `main` (the exact step that failed in run
  `37112815679`). That requires a live runner after the fix is committed.
- **Scope**: only the bus-catcher frontend was exercised; the change is test-only and confined to
  `StopCard.test.tsx`, so cross-module risk is negligible (confirmed by the untouched module code).

## Recommendation

Close the bug — verified locally at the level the change is testable. Land the fix (as a hotfix per
your request) and confirm the next CI `🧪 Test` step is green, which will also let the next
`🚀 Release` job proceed past validation.