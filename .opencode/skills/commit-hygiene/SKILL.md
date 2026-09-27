---
name: commit-hygiene
description: Prepare and verify git commits following the repository's commit-message conventions. Use when making a commit, staging changes, or drafting a commit message.
---

# Commit Hygiene

Prepare commits so they are clean, focused, and convention-compliant.

## Steps

1. Check the current state with `git status` and review the unstaged/staged diff.
2. Work on a branch named per the repository convention: `<feature|fix>/<NNN>-<short-description>`
   (e.g. `feature/002-user-auth`, `fix/003-crash-on-save`) — never a bare name without the
   `feature|fix/` prefix and feature number.
3. Decide a **focused, single-purpose commit** — avoid mixing unrelated changes.
4. Stage precisely the files for that commit (e.g., `git add <paths>`), not everything blindly.
5. Draft the commit message in conventional-commit style:
   `type(scope): summary` (e.g. `feat(bus-catcher): cache stop arrivals`), with a short body when
   needed. Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `build`, `ci`.
6. Verify the staged change set is correct before committing.
7. Remember: only `github-helper` runs git commands. Hand the commit itself to `github-helper`
   (message + staged intent) — never run `git commit`/`git push` yourself.

## Out of scope

Opening PRs, version bumps, and releases are owned by other agents/skills. Do not attempt them here.