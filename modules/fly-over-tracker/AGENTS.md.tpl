# {{MODULE_NAME}} — Agent Instructions

## GitHub operations

For any GitHub task — repositories, issues, pull requests, and Actions/CI runs — delegate to
the `github-helper` subagent (it has the GitHub MCP tools). Do not attempt GitHub API calls or
PR/issue mutations yourself unless delegated through `github-helper`.

## Multi-phase work

When implementing a feature across multiple phases:

- The agent MAY commit at the end of each phase, but MUST pause after committing and wait for
  explicit user confirmation before proceeding to the next phase.
- The agent MAY open a pull request when it considers a feature complete, but MUST NOT merge or
  otherwise finalize it: review and merge are the user's responsibility.

## Generated files

- `module.config.yaml` is the single source of truth for this module's identity.
- Documentation and packaging files generated from it (README, AGENTS, setup, package names)
  are rendered by `scripts/scaffold.mjs`. Run `node scripts/scaffold.mjs --check` after any
  hand edit that touches a generated file; a drift failure must be resolved by re-rendering or
  updating `module.config.yaml`, not by bypassing the check.