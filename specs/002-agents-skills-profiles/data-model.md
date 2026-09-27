# Data Model: Agents & Skills Profiles

**Branch**: `002-agents-skills-profiles` | **Date**: 2026-09-27 | **Spec**: [spec.md](spec.md)

Defines the entities this feature introduces. This is a configuration/documentation feature, so the
"data" are the declarative artifacts the repository ships. No runtime storage is involved.

---

## Entity: Agent profile

A named, delegated assistant role with a documented responsibility boundary.

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `name` | string | yes | Unique agent key, lowercase-hyphen (e.g., `nitpicker`). | Matches the file name `.opencode/agents/<name>.md`. |
| `description` | string | yes | One sentence: what the agent does and when to use it. | Third person; must be non-empty (agents without a description are not surfaced). |
| `mode` | enum | yes | `subagent` for all profiles. | Must be a valid opencode mode. |
| `permission` | map | no | Per-agent permission overrides (e.g., `github_*`, `bash` rules). | Must comply with the opencode permission schema; narrow rules after the catch-all. |
| `responsibilities` | string | yes | The agent's prompt body: what it does, step expectations. | Written in the file body; must not reference another profile's duties. |
| `out_of_scope` | string | yes | What the agent refuses to do and which profile it recommends instead. | Explicit in each prompt (FR-010, acceptance scenario 7). |
| `model` | string | no | Pinned model. | Left unset for all agents (inherit session model). |

**Relationships**: An agent profile implements one or more **delegation-contract** rules; the
`github-helper` profile is the only one permitted to touch git/GitHub operations.

## Entity: Skill

A named, discoverable procedure for a recurring workflow.

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `name` | string | yes | Lowercase hyphen-separated, ≤ 64 chars. | Must match the folder name `.opencode/skills/<name>/SKILL.md`. |
| `description` | string | yes | What it does **and** when to trigger it, third person, trigger keywords front-loaded. | Must be non-empty (skills without one are filtered out). |
| `procedure` | string | yes | Step-by-step guidance in the skill body. | Concrete, executable steps; references repo commands where relevant. |
| `license` / `metadata` | string / map | no | Optional frontmatter. | Optional. |

**Relationships**: A skill may be invoked by the main assistant or by an agent profile; it does not
own permission rules (permission lives on agents).

## Entity: AGENTS.md document

Developer guidance file for a scope of the repository.

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `scope` | enum | yes | `root` or `module:<slug>`. | Root at `AGENTS.md`; module at `modules/<slug>/AGENTS.md`. |
| `structure` | string | yes | How that scope is organized. | Accurate against the repository at merge time. |
| `commands` | string | yes | Common commands (install, lint, format, typecheck, test, changeset). | Matches the actual scripts in `package.json`. |
| `conventions` | string | yes | Quality gates and constitution principles that apply. | Consistent with `.specify/memory/constitution.md`. |
| `agent_skill_routing` | string | yes | Which agent/skill to use for which task, incl. git delegation. | Consistent with the delegation contract and skill catalog. |

**Relationships**: Every AGENTS.md references the agent profiles and skills that apply to its scope.

## Entity: Delegation contract

The rule set governing which assistant performs which class of operation.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `operation_class` | enum | yes | `git`, `github-mcp`, `code-change`, `review`, `design`, `validation`, `tests`, `docs`, `version-bump` |
| `owner` | string | yes | The agent profile responsible (only `github-helper` for `git`/`github-mcp`). |
| `others` | string | yes | All other agents MUST NOT perform this class (hard-enforced for git/GitHub). |
| `enforcement` | enum | yes | `hard` (permission deny) or `role` (documented boundary). |

**Relationships**: Maps directly to FR-001/FR-002 (git/GitHub → `github-helper`, hard-enforced) and to
the role boundaries of each profile.

---

## State transitions

Not applicable — this feature introduces no runtime stateful entities. Config files are declarative;
the only "transition" is opencode loading the config on startup, which is validated by the config
schema.

## Validation rules summary

- Every agent file: `mode: subagent`, non-empty `description`, explicit `out_of_scope`.
- Every skill file: `name` matches folder, non-empty `description` with trigger keywords.
- Root and all module AGENTS.md exist and cover the required sections (FR-015).
- `opencode.json` permission rules are schema-valid and last-match-wins ordered.