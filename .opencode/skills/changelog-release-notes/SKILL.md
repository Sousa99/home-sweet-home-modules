---
name: changelog-release-notes
description: Produce changesets and release notes following the repository's changesets fixed-group convention. Use when a change is complete, a release is prepared, or the version-analyser verifies bumps.
---

# Changelog & Release Notes

Every release goes through changesets with per-module fixed groups.

## Steps

1. Read `.changeset/config.json` to identify the fixed groups (e.g. each module's backend +
   components version together). Only the affected module's group should be bumped.
2. For each affected module, add a changeset — a markdown file under `.changeset/` following the
   changesets format — naming the fixed-group packages and the bump type:
   - **patch** — bug fixes;
   - **minor** — new backward-compatible functionality;
   - **major** — breaking changes.
   Include a short summary of the change.
3. Verify existing changesets: if a changeset for the change already exists, confirm the bump type
   and packages agree with the actual change; flag mismatches.
4. Draft release notes from the aggregated changesets when preparing a release. Publishing/versioning
   runs through CI (`.github/workflows/release.yml`) and `github-helper` — you do not publish.

## Notes

- The `version-analyser` agent uses this convention to guarantee the changeset agrees with its
  observations before a PR is opened.
- Hand git operations to `github-helper`; never commit/push yourself.