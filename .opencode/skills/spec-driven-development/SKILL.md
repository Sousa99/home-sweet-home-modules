---
name: spec-driven-development
description: Walk the Spec Kit workflow — specify, plan, then tasks — for a feature. Use when starting feature work or preparing implementation.
---

# Spec-Driven Development

Every feature follows the Spec Kit workflow: **specify → plan → tasks** before implementation.

## Steps

1. **Specify** — create/update the feature spec under `specs/NNN-name/spec.md` at the repository
   root (spec-driven development happens at the root only; modules carry no per-module spec
   directories). User scenarios, testable functional requirements, and measurable success criteria.
2. **Plan** — generate `research.md` (decisions), `data-model.md` (entities), `contracts/`
   (interface contracts), and `quickstart.md` (validation scenarios).
3. **Tasks** — break the plan into an executable task list in `tasks.md`, organized by user story
   with priorities, file paths, and parallel markers.
4. Implement task by task; commit through `github-helper`; before opening a PR, run the
   `version-analyser` to verify the changeset.

## Notes

- The constitution mandates spec-driven development and this workflow — do not skip phases.
- Hand git operations to `github-helper`; never commit/push yourself.