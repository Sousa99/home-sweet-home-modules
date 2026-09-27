---
name: test-first
description: Apply the red-green-refactor TDD cycle mandated by the constitution, using Vitest. Use when implementing a new behavior or fixing a bug.
---

# Test-First (Red-Green-Refactor)

TDD is non-negotiable in this repository (constitution principle IV). Apply it for any new behavior
or bug fix.

## Steps

1. **Red** — write the failing test first (Vitest, `*.test.ts`/`*.spec.ts` next to the code or under
   the module's `tests/`). It must test the desired behavior precisely.
2. **Get user approval** of the test before implementing (constitution requirement).
3. **Green** — implement the minimal code to make the test pass.
4. **Refactor** — clean up (naming, duplication, structure) while keeping tests green.
5. Re-run the test and the other quality gates before finishing.

## Notes

- Contract/integration changes (REST, MCP, shared schemas, dashboard API, module-to-module) also
  require contract/integration tests.
- Hand git operations to `github-helper`; never commit/push yourself.