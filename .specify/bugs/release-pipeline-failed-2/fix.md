# Bug Fix: Flaky StopCard threshold tests block the Release workflow

- **Slug**: release-pipeline-failed-2
- **Fixed**: 2026-10-03
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Removed the timing race in the two `StopCard` threshold tests: they previously awaited only the
`getStopTimes` mock being *called*, then immediately read the `[data-testid="urgency-dot"]` DOM
node — which could still be unmounted when the mock's promise resolved after the `waitFor` tick,
making `dot?.className` `undefined` and `.toContain()` throw intermittently and reddening the CI
`🧪 Test` step (which gates the `🚀 Release` job). Both tests now wait for the rendered dot inside a
`waitFor` before asserting the urgency class.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `modules/bus-catcher/frontend/src/components/StopCard.test.tsx` | modified | Replaced `waitFor(mock called)` + immediate DOM read with a single `waitFor` asserting the dot's className, in the "uses default thresholds" and "applies custom thresholds from the prop" cases. |

## Diff Highlights

```tsx
// "uses default thresholds when none are provided" (StopCard.test.tsx:146)
-    await waitFor(() => expect(mockedGetStopTimes).toHaveBeenCalled());
-    const dot = container.querySelector('[data-testid="urgency-dot"]');
-    expect(dot?.className).toContain('bg-amber-500');
+    await waitFor(() => {
+      expect(container.querySelector('[data-testid="urgency-dot"]')?.className).toContain(
+        'bg-amber-500',
+      );
+    });
```

```tsx
// "applies custom thresholds from the prop" (StopCard.test.tsx:163) — same pattern, bg-orange-500
```

## Tests Added or Updated

- `StopCard.test.tsx` → `uses default thresholds when none are provided` — updated to await the
  rendered `urgency-dot` before asserting `bg-amber-500`; no longer racy.
- `StopCard.test.tsx` → `applies custom thresholds from the prop` — updated identically for
  `bg-orange-500`.
- No new tests: the change is a de-flaking of existing cases; regression is locked by CI running
  the suite (and by a repeat-loop stress run locally).

## Local Verification

- Commands run:
  - `pnpm --filter ./modules/bus-catcher/frontend test` → PASS — 10 files, 73/73 tests (full suite, incl. the two updated cases)
  - `for i in $(seq 1 15); do vitest run src/components/StopCard.test.tsx; done` → PASS — 15/15 consecutive clean runs (180 executions) of the previously-flaky file
  - `pnpm --filter ./modules/bus-catcher/frontend exec eslint src/components/StopCard.test.tsx` → PASS (exit 0)
  - `pnpm --filter ./modules/bus-catcher/frontend typecheck` → PASS (`tsc --noEmit`, exit 0)
  - `pnpm exec prettier --check modules/bus-catcher/frontend/src/components/StopCard.test.tsx` → PASS
- Manual checks: re-read both updated blocks to confirm the `waitFor` wraps the query and assertion and no orphaned `dot` variable remains.

## Deviations from Assessment

None. The preferred remediation (wrap the className assertion in `waitFor`) was applied exactly as
proposed, to both affected cases. (`--repeat` is not a valid vitest 3 CLI flag, so the flake check
used a shell loop instead — same intent, no code impact.)

## Follow-ups

- Land on `main` (normal branch + PR flow via `github-helper`; this is not a hotfix). The next
  push to `main` will exercise the previously-red `🧪 Test` step and, on success, the full
  `🚀 Release` job.
- No changeset is expected — this is a test-only change with no behavioral/package impact.