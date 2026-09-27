# Verification Note — Agents & Skills Profiles

**Branch**: `002-agents-skills-profiles` | **Date**: 2026-09-27

Results of quickstart V1–V8 validation as of implementation time.

## Validated in-session

- **V1 (config loads)** — partial: `opencode.json` parses and is schema-valid against
  https://opencode.ai/config.json; keys are `$schema`, `mcp`, `permission`. The full opencode load
  check requires a restart (config is read on startup).
- **V6 (AGENTS.md coverage)** — PASS: `AGENTS.md`, `modules/bus-catcher/AGENTS.md`,
  `modules/fly-over-tracker/AGENTS.md`, `modules/procrastinator-tracker/AGENTS.md` all exist; content
  verified accurate against each module's README/setup (package names, run commands, ports, docs
  pointers, changeset fixed groups).
- **V7 (repo gates)** — PASS: `pnpm lint`, `pnpm format`, `pnpm typecheck`, `pnpm test` all green
  (test suite: 163+25+... passed across modules).

## Artifacts present

- 8 agents: `github-helper`, `nitpicker`, `reviewer`, `architect`, `implementer`, `tester`,
  `documenter`, `version-analyser` (`.opencode/agents/`).
- 5 skills: `commit-hygiene`, `quality-gates`, `test-first`, `spec-driven-development`,
  `changelog-release-notes` (`.opencode/skills/<name>/SKILL.md`).
- Hard enforcement in `opencode.json`: main assistant denied `github_*`, `git`, `git *`, `gh`,
  `gh *`; `github-helper` overrides to allow them.

## Requires restart + interactive session (NOT done here)

- **V2** hard-delegation proof (ask main assistant to commit/push → refuses, delegates).
- **V3** `github-helper` end-to-end commit+push.
- **V4** each profile invocable + out-of-role decline.
- **V5** each skill loadable on demand.
- **V8** pre-PR version gate: `github-helper` runs `version-analyser` before opening a PR.

**Action required**: quit and restart opencode, then run quickstart V1–V5, V8. Until restarted, the
running session still uses the previous config.