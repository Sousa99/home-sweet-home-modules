---
name: commit-hygiene
description: Prepare and verify git commits following the repository's commit-message conventions. Use when making a commit, staging changes, or drafting a commit message.
---

# Commit Hygiene

Prepare commits so they are clean, focused, and convention-compliant.

## Steps

1. Check the current state with `git status` and review the unstaged/staged diff.
2. Decide a **focused, single-purpose commit** — avoid mixing unrelated changes.
3. Stage precisely the files for that commit (e.g., `git add <paths>`), not everything blindly.
4. Draft the commit message in conventional-commit style:
   `type(scope): summary` (e.g. `feat(bus-catcher): cache stop arrivals`), with a short body when
   needed. Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `build`, `ci`.
5. Verify the staged change set is correct before committing.
6. Remember: only `github-helper` runs git commands. Hand the commit itself to `github-helper`
   (message + staged intent) — never run `git commit`/`git push` yourself.

## Out of scope

Opening PRs, version bumps, and releases are owned by other agents/skills. Do not attempt them here.