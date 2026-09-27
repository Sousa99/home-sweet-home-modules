---
name: quality-gates
description: Run and interpret the repository's quality gates — ESLint, Prettier, typecheck, and the Vitest suite. Use before merge or when verifying a change is gate-clean.
---

# Quality Gates

Verify a change is clean against the repository's uniform gates before merge.

## Steps

1. Run the gates from the repository root:
   - `pnpm lint` (ESLint)
   - `pnpm format` (Prettier check)
   - `pnpm typecheck` (recursive typecheck)
   - `pnpm test` (recursive Vitest suite)
2. For a single module, use a filter, e.g.
   `pnpm --filter ./modules/<slug>/backend lint` or the equivalent frontend command.
3. Interpret failures:
   - Prettier/ESLint drift → fix or run `pnpm format:write` / `eslint --fix`.
   - Typecheck errors → fix the reported types.
   - Test failures → report precisely (test name, file, error) and follow the test-first convention
     for any fix.
4. Report a clear gate verdict: **clean** or **failing**, listing the failing gates and files.

## Notes

- All modules extend the shared presets from `@sousa99/homesweethome-config`, so gate behavior is
  identical across the ecosystem.
- Hand git operations to `github-helper`; never commit/push yourself.