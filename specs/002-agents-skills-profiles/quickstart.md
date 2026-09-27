# Quickstart: Agents & Skills Profiles

**Branch**: `002-agents-skills-profiles` | **Date**: 2026-09-27 | **Spec**: [spec.md](spec.md)

Runnable validation scenarios proving the feature works end-to-end. Details of each entity live in
[data-model.md](data-model.md) and the contracts in [contracts/](contracts/).

## Prerequisites

- Node 24 LTS and pnpm 11 (`packageManager: pnpm@11.25.0`).
- `GITHUB_PERSONAL_ACCESS_TOKEN` set for the GitHub MCP server (already required by the existing
  `opencode.json`).
- opencode installed; config is read on startup (not hot-reloaded) — **restart opencode after any
  config change**.

## Setup

```bash
pnpm install
# restart opencode so opencode.json, .opencode/agents, and .opencode/skills are loaded
```

## Validation scenarios

### V1 — Config loads without errors

1. Restart opencode in the repo root.
2. Confirm it starts without a `ConfigInvalidError` (opencode hard-fails on invalid config).
3. Expected: the seven subagents are selectable and the five skills are discoverable.

### V2 — Hard git/GitHub delegation (SC-001)

1. In the main assistant, ask it to commit and push a change.
2. Expected: the main assistant **cannot** run `git`/`gh` commands or GitHub MCP tools; it refuses and
   delegates to `github-helper`.
3. Confirm `github-helper` performs the operation and reports the result.

### V3 — github-helper end-to-end git operation

1. Make a trivial change (e.g., a doc tweak) in a scratch branch.
2. Delegate to `github-helper`: "commit this change and push it".
3. Expected: the commit lands with a message following the repo conventions, and the push succeeds.

### V8 — Pre-PR version gate (SC-007)

1. In a branch with a module change, delegate to `github-helper`: "open a pull request".
2. Expected: `github-helper` first runs the `version-analyser`, which evaluates which modules need a
   version bump and the bump type, and produces/verifies a matching changeset under `.changeset/`;
   only then is the PR opened.
3. Repeat without any changeset present; expected: the version-analyser flags/produces the changeset
   and the PR is not opened before it agrees with the observations.

### V4 — Every profile is invocable (FR-011)

For each of `nitpicker`, `reviewer`, `architect`, `implementer`, `tester`, `documenter`,
`version-analyser`:
1. Invoke it on a representative sample task (see [contracts/agent-profiles.md](contracts/agent-profiles.md)).
2. Expected: output matches the documented role (e.g., nitpicker → prioritized minor-fix list;
   architect → design review of module boundaries; version-analyser → bump decision + matching
   changeset).
3. Invoke it with an out-of-role request; expected: it declines and recommends the owning profile.

### V5 — Every skill is loadable (FR-012)

For each skill in [contracts/skills-catalog.md](contracts/skills-catalog.md):
1. Trigger a matching task (e.g., "prepare a commit" → commit-hygiene).
2. Expected: the skill's guidance loads and drives the outcome (conformant commit, gate verdict, TDD
   cycle, spec-loop steps, or changeset).

### V6 — AGENTS.md coverage (FR-011–FR-015)

1. Expected files exist: `AGENTS.md`, `modules/bus-catcher/AGENTS.md`,
   `modules/fly-over-tracker/AGENTS.md`, `modules/procrastinator-tracker/AGENTS.md`.
2. Each covers structure, commands, conventions, and agent/skill routing, and is accurate against the
   repository.

### V7 — Repository gates remain green

1. Run `pnpm lint`, `pnpm format`, `pnpm typecheck`, `pnpm test`.
2. Expected: all pass (the feature adds no runtime code; config/docs only).

## Interpretation of results

- V1 + V7 failing ⇒ config/schema or repo-gate regression; fix before merge.
- V2 failing ⇒ hard enforcement not active; do not merge.
- V3 failing ⇒ `github-helper` cannot execute git ops; check its permission overrides.
- V8 failing ⇒ the pre-PR version gate is not enforced; do not open PRs until the version-analyser
  has verified the changeset.
- V4/V5 failing ⇒ a profile/skill is missing or mis-described.
- V6 failing ⇒ missing/out-of-date AGENTS.md.