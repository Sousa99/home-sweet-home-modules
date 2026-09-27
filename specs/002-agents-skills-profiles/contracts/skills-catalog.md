# Skills Catalog Contract

**Branch**: `002-agents-skills-profiles` | **Date**: 2026-09-27 | **Spec**: [spec.md](../spec.md)

The five reusable skills (FR-011/FR-012). Each is a file
`.opencode/skills/<name>/SKILL.md` with `name` + `description` frontmatter (description = what + when,
third person, trigger keywords front-loaded) and a procedural body.

---

## commit-hygiene

- **name**: `commit-hygiene`
- **description**: Prepare and verify git commits following the repository's commit-message
  conventions. Use when making a commit, staging changes, or drafting a commit message.
- **procedure**: check staging; draft message following conventions; stage precisely; verify the
  change set; hand the commit itself to `github-helper`.

## quality-gates

- **name**: `quality-gates`
- **description**: Run and interpret the repository's quality gates — ESLint, Prettier, typecheck,
  and the Vitest suite. Use before merge or when verifying a change is gate-clean.
- **procedure**: run `pnpm lint`, `pnpm format`, `pnpm typecheck`, `pnpm test`; interpret failures;
  fix or escalate; report a gate verdict.

## test-first

- **name**: `test-first`
- **description**: Apply the red–green–refactor TDD cycle mandated by the constitution. Use when
  implementing a new behavior or fixing a bug.
- **procedure**: write the failing test (red) → confirm it fails → implement minimally (green) →
  refactor → re-run; keep Vitest as the runner; get user approval of tests before implementing.

## spec-driven-development

- **name**: `spec-driven-development`
- **description**: Walk the Spec Kit workflow — specify, plan, then tasks — for a feature. Use when
  starting feature work or preparing implementation.
- **procedure**: create/update spec → plan (research, design, contracts) → tasks; keep specs at the
  repository root under `specs/`; no per-module spec directories.

## changelog-release-notes

- **name**: `changelog-release-notes`
- **description**: Produce changesets and release notes following the repository's changesets fixed-
  group convention. Use when a change is complete or a release is prepared. Also used by the
  `version-analyser` to guarantee the changeset agrees with its version-bump observations.
- **procedure**: add a changeset for the affected module's fixed group; draft release notes; verify
  `.changeset/config.json` groups; hand publish steps to `github-helper`/CI.

---

## Cross-cutting requirements

- **FR-012**: each skill is discoverable (name + description) and loadable on demand.
- **FR-016**: all skill procedures comply with the constitution (test-first, spec-driven, changesets
  fixed groups, uniform presets).