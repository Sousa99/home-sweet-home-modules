# Research: Agents & Skills Profiles

**Branch**: `002-agents-skills-profiles` | **Date**: 2026-09-27 | **Spec**: [spec.md](spec.md)

Phase 0 output. Resolves the unknowns in the Technical Context of [plan.md](plan.md) and documents
technical decisions with rationale and alternatives.

---

## R1 — Hard-enforced git/GitHub delegation mechanism

**Decision**: Enforce delegation with `permission` rules in `opencode.json`, replacing the deprecated
`tools` boolean field (deprecated since opencode v1.1.1 and merged into `permission`).

- **Main assistant** gets:
  - `"permission": { "github_*": "deny" }` — blocks every GitHub MCP tool (`github_*` matches the
    MCP server tool namespace used by the existing config).
  - `"permission": { "bash": { "*": "allow", "git *": "deny", "git": "deny", "gh *": "deny", "gh": "deny" } }`
    — blocks git and GitHub-CLI shell commands while leaving all other shell use untouched.
- **`github-helper` agent** gets an override (agent permissions merge with global and take precedence):
  - `"permission": { "github_*": "allow", "bash": { "*": "deny", "git *": "allow", "git": "allow", "gh *": "allow", "gh": "allow" } }`
    — owns GitHub MCP tools and git/gh shell commands, nothing else.

**Rationale**: Permission is the current, non-deprecated mechanism. `permission.bash` patterns match
*parsed* commands (e.g., `git status --porcelain`), and rules are evaluated with the **last matching
rule winning**, so the catch-all `"*"` must come first and the narrow deny rules last. Because these
rules sit in the project `opencode.json`, they apply on every session in this repository; a user who
bypasses them is actively overriding config, not just relying on a convention.

**Alternatives considered**:
- Keep the deprecated `tools: { "github_*": false }` for MCP gating and only add `bash` rules — works
  but leaves a deprecated field in place; rejected in favor of a full migration.
- Convention-only (documented rule) — rejected by the spec (decision Q1 = hard-enforced).

**Fallback**: If, at implementation time, the `github_*` key in `permission` does not filter MCP tools
as expected, retain `tools: { "github_*": false }` for MCP gating (still supported) alongside the
`permission.bash` rules. Verify with `opencode debug config` after restart.

**Implementation verdict (T002)**: Confirmed against opencode's documentation and config schema —
`permission` is keyed by tool name (permission-config `additionalProperties` → rule config), so
`"github_*": "deny"` is a valid tool-level deny; `permission.bash` patterns match parsed commands
with last-match-wins. The `github_*` namespace matches the existing working `tools` config, so the
permission-based approach is used as the primary mechanism with the `tools` fallback documented
above.

## R2 — Agent definition format

**Decision**: Define all eight subagents as markdown files under `.opencode/agents/<name>.md`
(opencode's preferred file form; plural `agents/` is the documented convention). The file body becomes
the agent's prompt; frontmatter carries `description`, `mode: subagent`, and `permission`.

**Rationale**: File form is what opencode's docs recommend "for anything non-trivial". It keeps role
prompts (including the role-boundary behavior from FR-010 / acceptance scenario 7) readable and
versioned per agent instead of inlining long prompts in `opencode.json`. The plural `agents/`
directory matches the existing `.opencode/commands/` convention.

**Frontmatter fields used**: `description` (required for subagents to be surfaced), `mode: subagent`,
`permission` (per-agent overrides). No `model` is pinned so agents inherit the session model.

**Alternatives considered**:
- Inline `agent: { ... }` in `opencode.json` — rejected: the inline agent schema still exposes
  `tools`, which is deprecated; file form is cleaner for 7 prompts.
- Singular `.opencode/agent/` — supported for backwards compatibility but plural is preferred.

## R3 — Skills layout and frontmatter

**Decision**: Create `.opencode/skills/<name>/SKILL.md` for each of the five skills, with frontmatter
`name` (lowercase hyphen-separated, ≤ 64 chars, matches the folder name) and `description`
(one sentence: what it does **and** when to trigger it, written third-person, front-loading the
literal keywords/filenames a user would say). Skill bodies contain step-by-step procedures.

**Rationale**: This is the canonical opencode skill location and schema. Skills without a useful
`description` are filtered out and never surfaced to the model, so the description is the 
discoverability contract (FR-012).

**Alternatives considered**: Global skills under `~/.config/opencode/skills/` — rejected: these skills
are repository-specific (commit conventions, quality gates, changesets) and must be versioned with the
repo.

## R4 — AGENTS.md scope and content

**Decision**: Root `AGENTS.md` plus one `AGENTS.md` per registered module
(`modules/bus-catcher/`, `modules/fly-over-tracker/`, `modules/procrastinator-tracker/`). Content is
derived from existing material — root README, per-module README + `setup.md` + `docs/`, and the
constitution — so it is accurate without new documentation efforts (spec assumption).

**Required sections** (per FR-015):
- Root AGENTS.md: repository structure, one-liner per module, common commands (pnpm install/lint/
  format/typecheck/test/changeset), quality gates, constitution pointers, and **agent/skill routing**
  (which agent to delegate git/GitHub ops to, which profile for review/architecture/tests/docs, which
  skill for commits/gates/tdd/spec-loop/changelog).
- Module AGENTS.md: module purpose, backend/frontend packages, run/dev/test commands, ports,
  module docs pointers, and module-specific conventions.

**Rationale**: Root + per-module split matches the spec (FR-011/FR-012) and the ecosystem convention.
The routing section is what makes the delegation contract executable by the model.

**Alternatives considered**: A single root AGENTS.md covering everything — rejected: per-module files
keep module specifics where contributors actually work (spec P3 story).

## R5 — Permission pattern semantics

**Decision**: Use object-syntax granular rules with the documented last-match-wins behavior: put the
catch-all first, narrow rules after. `"git *"` (with wildcard) matches git commands with arguments;
the bare command form (`"git"`) is added to also cover the no-argument invocation. Use `"*"` as the
first rule so default behavior is preserved and only git/gh are denied.

**Rationale**: Confirmed against opencode's permissions documentation; the docs example itself blocks
`git commit *`/`git push *` in exactly this shape.

## R6 — Agent model selection

**Decision**: Do not pin models on any agent. All profiles inherit the session's selected model.

**Rationale**: Keeps agents provider-agnostic and lets the user choose per session; the existing
`github-helper` config does not pin a model either.

---

## Open questions for implementation (non-blocking)

- Confirm at implementation time that the `github_*` permission key filters the GitHub MCP tools as
  expected (R1 fallback if not).
- Confirm the exact MCP tool namespace emitted by the remote GitHub MCP server (should be `github_*`
  per the existing working `tools` config).