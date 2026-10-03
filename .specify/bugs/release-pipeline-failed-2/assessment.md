# Bug Assessment: Release pipeline failed — flaky StopCard test blocks the Release workflow

- **Slug**: release-pipeline-failed-2
- **Created**: 2026-10-03
- **Source**: pasted text
- **Verdict**: valid
- **Severity**: medium

## Report (verbatim or summarized)

> the release pipeline failed

No URL supplied (URL trust policy: N/A — nothing to fetch). Live CI evidence was gathered via
`gh run list` / `gh run view` (delegated to `github-helper`). This is the third "release pipeline
failed" report; the two prior pipeline-config bugs (`release-version-bump`, `release-pipeline-failed`)
are confirmed fixed on `main` and are **not** implicated.

## Symptom

The **Release** workflow failed again, but this time the failure is **not in the release pipeline
itself**. Run `37112815679` (triggered by push of `9599814` "feat(speckit)…" on 2026-10-03) died in
the `🧪 Validate` job's `🧪 Test` step — a flaky `bus-catcher` frontend Vitest assertion — so the
`🚀 Release` job never ran. Expected: the module test suite is deterministic and the workflow
proceeds to the Release job. Observed: `StopCard.test.tsx:148` asserted on a DOM node that had not
rendered yet, failing intermittently with:

```
AssertionError: the given combination of arguments (undefined and string) is invalid for this
assertion. You can use an array, a map, an object, a set, a string, or a weakset instead of a string
❯ src/components/StopCard.test.tsx:148:28
```

The same test passed ~4 minutes earlier in run `37112603535` (triggered by the fix commit
`2d579f7`) on identical module code — commit `9599814` touched only `.opencode/` and `.specify/`
docs/config, no module code. The two prior fixes (`version: pnpm changeset version`,
`createGithubReleases: false`) are on `origin/main`, were observed live in run `37112603535`
(success, end-to-end, `release-modules.sh` fully idempotent), and are working.

## Reproduction

1. Run the bus-catcher frontend test suite: `pnpm --filter ./modules/bus-catcher/frontend test`.
2. Under load (or on a slower CI runner), the `uses default thresholds when none are provided`
   case (and the sibling `applies custom thresholds from the prop` case) intermittently hits the
   race at `StopCard.test.tsx:148` (and `:163`):
   - line 146/161 awaits `waitFor(() => expect(mockedGetStopTimes).toHaveBeenCalled())` — this only
     guarantees the fetch was *called*, not that the component re-rendered with the result;
   - line 147/162 immediately queries `container.querySelector('[data-testid="urgency-dot"]')`,
     which can still be `null` → `dot?.className` is `undefined` → `.toContain('bg-amber-500')`
     throws.
3. The `🧪 Validate` job fails at `pnpm test`; because `release` has `needs: validate`, the `🚀
   Release` job is skipped and the workflow is red.

## Suspected Code Paths

- `modules/bus-catcher/frontend/src/components/StopCard.test.tsx:141-149` — the `uses default
  thresholds when none are provided` case: awaits only the mock call before reading the DOM. This is
  the line that failed (`:148`).
- `modules/bus-catcher/frontend/src/components/StopCard.test.tsx:151-164` — the `applies custom
  thresholds from the prop` case: identical flawed pattern (`:163`), same latent race, not yet the
  one that flaked.
- `.github/workflows/release.yml:19-53` — the `🧪 Validate` job whose `🧪 Test` step gates the
  `🚀 Release` job (`needs: validate` at line 56); the failure is a test flake, not a workflow
  defect.

## Root Cause Hypothesis

**Confidence: high.**

`StopCard.test.tsx` asserts the urgency-dot `className` immediately after waiting only for the
`getStopTimes` mock to be *called*. React commits the fetch result to the DOM asynchronously, so
when the mock's promise resolves after the `waitFor` callback fires, the `[data-testid="urgency-dot"]`
element is not yet mounted and `dot?.className` is `undefined`. `expect(undefined).toContain('bg-amber-500')`
is invalid and throws. It is a pure timing race in the test — the component behavior is correct
(the same assertion is reached reliably by the `findBy*`-based cases at lines 113/128). Two
consecutive identical-code runs flipping pass/fail confirm the flake; the release workflow config is
correct and uninvolved.

## Proposed Remediation

**Preferred**: make the two threshold tests wait for the rendered element instead of only the fetch
call. Replace the query-then-assert with a single awaited waitFor, e.g.:

```ts
await waitFor(() => {
  expect(container.querySelector('[data-testid="urgency-dot"]')?.className).toContain('bg-amber-500');
});
```

or use the async `screen.findByTestId('urgency-dot')` and assert on the awaited node. Apply the same
change to both cases (`:148` and `:163`).

**Alternatives** (optional):
- Assert via `await screen.findByText('Cais')` (as the other passing cases do) to guarantee the
  fetch result is rendered before reading the dot — but it couples the assertion to unrelated
  content; the `waitFor`/`findByTestId` form is more direct.
- Keep the query but guard it: `expect(dot).not.toBeNull()` before `expect(dot?.className)…`.
  Trade-off: still racy unless the null-guard is inside a `waitFor`.

**Files likely to change**:
- `modules/bus-catcher/frontend/src/components/StopCard.test.tsx`

**Tests to add or update**:
- The two existing threshold tests are updated (not new tests); the fix is verified by repeatedly
  running the bus-catcher frontend Vitest suite (e.g. `vitest run --repeat 20` on
  `StopCard.test.tsx`) and by a green CI run — a repeat loop is the honest flake check since the
  race is timing-dependent.

## Risks & Considerations

- **Pipeline block**: the flake makes `validate` red intermittently, which silently blocks the
  `🚀 Release` job (`needs: validate`) and future releases until manually re-run. Medium impact —
  no data/package risk, no code misbehavior.
- **Not the release config**: no workflow changes are proposed; the `release.yml` fixes from the
  two prior bugs stand as-is.
- **Observability**: consider noting the flake fix in the module's changelog path via a changeset
  only if a behavior change accompanies it — this is test-only, so no changeset is expected.
- **Low residual risk** — test-only edit; no API/migration/security/performance impact.

## Open Questions

- [NEEDS CLARIFICATION: none blocking — whether to also pin CI workers (e.g. CPU/load) to reduce
  timing jitter is out of scope; fixing the test race removes the need.]