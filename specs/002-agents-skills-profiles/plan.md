# Implementation Plan: Agents & Skills Profiles

**Branch**: `002-agents-skills-profiles` | **Date**: 2026-09-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-agents-skills-profiles/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

Configure the repository's opencode developer-assistant setup so that (1) **all git/GitHub operations are hard-enforced to a single dedicated `github-helper` subagent** and the main assistant can no longer perform them (removing the deprecated `tools` field in favor of `permission` rules); (2) a **seven-profile specialist agent catalog** exists — `nitpicker`, `reviewer`, `architect`, `implementer`, `tester`, `documenter`, `version-analyser` — each a delegated subagent with a documented role boundary, with the `version-analyser` running before every pull request to evaluate version bumps and guarantee the changeset agrees; (3) a **five-skill reusable library** exists — commit-hygiene, quality-gates, test-first, spec-driven-development, changelog/release-notes; and (4) **AGENTS.md** exists at the repository root and in every module. All artifacts are markdown/JSON configuration plus documentation; no runtime code, no storage, no new dependencies. Validation is config-schema loading plus end-to-end invocation scenarios, keeping the existing eslint/prettier/typecheck/test gates green.

## Technical Context

**Language/Version**: Configuration and documentation only — Markdown, JSON, YAML. No application code language. Validation runtime: Node 24 LTS, pnpm 11 (`packageManager: pnpm@11.25.0`).

**Primary Dependencies**: opencode (project config schema `https://opencode.ai/config.json`), GitHub MCP server (remote, configured in `opencode.json`). No new runtime dependencies.

**Storage**: N/A — flat config files on disk (`opencode.json`, `.opencode/agents/*.md`, `.opencode/skills/*/SKILL.md`, `AGENTS.md`, `modules/*/AGENTS.md`).

**Testing**: opencode config-schema validation (opencode hard-fails on invalid config); manual invocation/verification scenarios (see `quickstart.md`); existing repo gates (`pnpm lint`, `pnpm format`, `pnpm typecheck`, `pnpm test`) must remain green.

**Target Platform**: opencode assistant running in the developer environment (macOS, Node 24); GitHub Actions CI is unchanged and must keep passing.

**Project Type**: Dev-tooling configuration for an AI coding assistant (agents, skills, and developer documentation) inside an existing pnpm monorepo.

**Performance Goals**: N/A — no runtime code paths; config load time and invocation latency are not measured.

**Constraints**: opencode config must load without `ConfigInvalidError`; no practice may contradict the constitution; every existing quality gate must stay green; delegation must be hard-enforced (main assistant physically unable to run git/GitHub operations).

**Scale/Scope**: 8 subagents (7 new profiles + existing `github-helper`), 5 skills, 4 AGENTS.md files (root + 3 registered modules), 1 modified `opencode.json`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Verdict | Notes |
|---|-----------|---------|-------|
| I | Module-First | PASS (interpretation) | Repo-root developer tooling (`opencode.json`, `.opencode/`, root AGENTS.md) is infrastructure analogous to `.github/workflows` and `docs/` — explicitly outside the "household capability module" scope. No new module is created. |
| II | Local-First & Private | PASS | No data is collected, stored, or transmitted; everything operates on local config/docs. |
| III | Declared Identity & Uniform Tooling | PASS | No module identity changes; AGENTS.md documents the shared `@sousa99/homesweethome-config` presets and uniform gates. |
| IV | Test-First | PASS (equivalent) | No runtime code to TDD. Validation equivalent: each agent/skill has a runnable verification scenario (quickstart.md) and the existing test suite must still pass untouched. |
| V | Contract & Integration Testing | PASS | The delegation contract and the GitHub MCP integration are validated end-to-end via quickstart scenarios (commit → push → PR through `github-helper` only). |

No violations requiring justification → Complexity Tracking table not needed.

**Post-design re-check (after Phase 1)**: PASS — the design artifacts (contracts, data model,
quickstart) introduce no runtime code, no storage, no new module, no identity drift, and keep every
gate green; all agent/skill documentation is consistent with the constitution's principles.

## Project Structure

### Documentation (this feature)

```text
specs/002-agents-skills-profiles/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── delegation-contract.md
│   ├── agent-profiles.md
│   └── skills-catalog.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Configuration (repository root)
opencode.json                              # MODIFIED: git/GitHub hard-enforcement + github-helper agent
                                           # (permission-based; replaces deprecated tools field)
AGENTS.md                                  # NEW: root developer guidance
modules/<slug>/AGENTS.md                   # NEW x3: per-module guidance (bus-catcher,
                                           # fly-over-tracker, procrastinator-tracker)

# opencode agents (subagent profiles)
.opencode/agents/github-helper.md           # NEW (moved from opencode.json inline form)
.opencode/agents/nitpicker.md               # NEW
.opencode/agents/reviewer.md                # NEW
.opencode/agents/architect.md               # NEW
.opencode/agents/implementer.md             # NEW
.opencode/agents/tester.md                  # NEW
.opencode/agents/documenter.md              # NEW
.opencode/agents/version-analyser.md        # NEW (runs before every PR: version bump + changeset)

# opencode skills
.opencode/skills/commit-hygiene/SKILL.md              # NEW
.opencode/skills/quality-gates/SKILL.md               # NEW
.opencode/skills/test-first/SKILL.md                  # NEW
.opencode/skills/spec-driven-development/SKILL.md     # NEW
.opencode/skills/changelog-release-notes/SKILL.md     # NEW
```

**Structure Decision**: Agent definitions move from inline `opencode.json` form to the opencode-preferred file form (`.opencode/agents/<name>.md`), where the file body becomes the agent prompt and frontmatter carries `description`, `mode`, and `permission`. The git/GitHub hard-enforcement stays in `opencode.json` top-level `permission` rules (so it applies to the main agent), with the `github-helper` agent granted explicit `github_*` and git-bash permissions. Skills use the canonical `.opencode/skills/<name>/SKILL.md` layout with `name` + `description` frontmatter (description must front-load trigger keywords). AGENTS.md follows the standard root + per-module convention used by the ecosystem.

## Complexity Tracking

> Not applicable — Constitution Check passes with no violations.