# Delegation Contract

**Branch**: `002-agents-skills-profiles` | **Date**: 2026-09-27 | **Spec**: [spec.md](../spec.md)

Defines which assistant performs which class of operation. This is the executable rule set that the
agent prompts, AGENTS.md files, and `opencode.json` permission rules implement.

## Operation classes

| Class | Owner (only one) | All others | Enforcement |
|-------|------------------|------------|-------------|
| `git` (commit, push, branch, rebase, status, log, stash…) | `github-helper` | MUST NOT run git commands | **hard** — main assistant `permission.bash` denies `git`, `git *`; only `github-helper` overrides to allow |
| `github-mcp` (PR, issue, CI/Actions, repo, release via GitHub MCP) | `github-helper` | MUST NOT use GitHub MCP tools | **hard** — main assistant `permission: { "github_*": "deny" }`; only `github-helper` overrides to allow |
| `github-cli` (`gh` commands) | `github-helper` | MUST NOT run `gh` commands | **hard** — main assistant denies `gh`, `gh *` |
| `code-change` (implement planned work) | `implementer` | reviewed by `reviewer`, validated by `nitpicker` | role boundary |
| `design` (architecture, module boundaries, spec readiness) | `architect` | others defer to it in design phase | role boundary |
| `review` (changes vs conventions and gates) | `reviewer` | others defer to it pre-merge | role boundary |
| `validation` (final minor-fix pass) | `nitpicker` | others defer to it as final gate | role boundary |
| `tests` (suite + coverage vs gates) | `tester` | others defer for test verdicts | role boundary |
| `docs` (README/setup/docs sync) | `documenter` | others flag doc drift, defer updates | role boundary |
| `version-bump` (which modules bump, bump type, changeset conformance) | `version-analyser` | MUST run before any PR is opened; others defer | role boundary + gate |

## Rules

1. **FR-001/FR-002 — hard-enforced git/GitHub ownership**: every git/GitHub operation in a session is
   performed by `github-helper`, never by the main assistant. The main assistant MUST delegate any
   such request to `github-helper`. Enforcement is technical (permission deny), not a convention.
2. **One owner per class**: no two profiles may perform the same operation class.
3. **Out-of-scope behavior**: a profile asked to perform an operation outside its class states so and
   recommends the owning profile instead of doing the work (FR-011, acceptance scenario 8).
4. **Pre-PR version gate (FR-010/SC-007)**: before `github-helper` opens any pull request, the
   `version-analyser` MUST run: evaluate which modules need a version bump and the bump type, and
   verify or produce a matching changeset. `github-helper` MUST NOT open the PR until the
   `version-analyser` confirms the changeset agrees with its observations.
5. **Handoff sequence** for a feature lifecycle:
   `architect` (design) → `implementer` (test-first code) → `tester` (suite/coverage) →
   `reviewer` (pre-merge review) → `nitpicker` (final validation) → `documenter` (docs sync) →
   `version-analyser` (version bump + changeset) → `github-helper` (commit, push, PR, CI). Steps run
   on demand; a step may be skipped when not applicable, but git/GitHub steps always route to
   `github-helper`, and the version gate always runs before opening a PR.

## Verification

- In a session, `github-helper` performs 100% of git/GitHub operations (SC-001).
- Attempting a git operation from the main assistant yields a deny/refusal, not an execution.
- See [quickstart.md](../quickstart.md) for runnable scenarios.