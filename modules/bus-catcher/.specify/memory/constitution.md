<!--
Sync Impact Report
- Version change: 0.0.0 (unratified template scaffold) → 1.0.0
- Modified principles: none (initial ratification; all five principles are new)
- Added sections: Core Principles (I–V), Data & Integration Constraints,
  Development Workflow & Quality Gates, Governance
- Removed sections: none
- Follow-up TODOs: none
-->
# bus-catcher Constitution

## Core Principles

### I. Location-Scoped Data
All bus information MUST be resolved against a given location, expressed as
coordinates or a named place. Every query MUST either carry a location or
derive one from an explicit context; context-free, global bus queries are not
allowed. Rationale: the module's purpose is "buses at a given location" — the
location is the primary key of the domain and everything else hangs off it.

### II. Freshness-Aware Realtime
Transit information is time-sensitive. Every data point MUST carry a timestamp
of when it was produced and when it was fetched. Data older than a defined
staleness budget MUST be flagged as stale and MUST NOT be presented as live.
Rationale: catching a bus depends on accurate, current predictions; stale data
is actively harmful and erodes trust in the dashboard.

### III. Provider Abstraction
Transit data sources (GTFS feeds, transit APIs) MUST be reached only through
adaptors implementing a stable, application-defined contract. Swapping or
adding a provider MUST NOT change the application-facing contract. Adaptors
MUST be self-contained and independently testable. Rationale: providers and
their formats change and fail; the module must not be coupled to any single
source.

### IV. Test-First (NON-NEGOTIABLE)
TDD is mandatory: tests are written, reviewed, and confirmed to fail before
the implementation is written; Red-Green-Refactor is strictly enforced.
Provider parsing, time/timezone conversion, and staleness logic MUST have
dedicated tests. Rationale: transit data parsing and scheduling math are
error-prone, and correctness is the product.

### V. Observability & Correct Time Handling
Every provider request, response, cache hit, and cache decision MUST be
loggable via structured logging. All internal time handling MUST use a single
canonical representation (UTC internally); local-time conversions MUST state
an explicit timezone and DST policy, and MUST NOT persist local times without
an offset. Rationale: debuggability and correct arrival times across
timezones and DST transitions depend on disciplined time modeling.

## Data & Integration Constraints

- GTFS/transit parsing MUST validate records against schemas; unknown or
  malformed records are skipped with a warning, never a crash.
- Provider rate limits MUST be respected; caching MUST carry TTLs that honor
  the staleness budget from Principle II.
- Privacy: locations MUST be handled at a coarse, useful granularity; home
  addresses MUST NOT be logged or persisted.
- Failure isolation: a failing provider MUST NOT take down the API or MCP
  server; degraded results are reported, not fatal.
- REST (`--http`) and MCP (`--mcp`) modes MUST share the same service layer
  and MUST NOT be split into separate packages.

## Development Workflow & Quality Gates

- All gates MUST pass before commit/merge: `pnpm lint`, `pnpm format`,
  `pnpm test`, `pnpm typecheck`, and `node scripts/scaffold.mjs --check`.
- CI enforces the gates on every pull request; the Release workflow runs on
  push to `main` and derives the shared version from conventional commits.
- Living documentation: documentation updates land in the same change as the
  code they describe.
- Dependency hygiene: keep a single instance of each critical package; run
  `pnpm install`/`pnpm dedupe` after dependency changes.
- Toolchain parity: the IDE uses the workspace TypeScript; IDE errors that do
  not reproduce in `tsc` are toolchain mismatches to fix, not to ignore.

## Governance

The constitution supersedes all other practices: any conflict is resolved in
favor of this document. Amendments require a documented proposal with
rationale, a semantic-version bump, and approval through review; every PR
MUST verify compliance with these principles and call out exceptions.
Versioning follows semantic versioning: MAJOR for incompatible principle
removals or redefinitions, MINOR for new principles or materially expanded
guidance, PATCH for clarifications and wording fixes. Complexity MUST be
justified; simpler designs are preferred where they meet the principles.
Use the Spec Kit workflow (specify → plan → tasks → implement) for feature
work and the bug-triage extension for defect reports.

**Version**: 1.0.0 | **Ratified**: 2026-09-23 | **Last Amended**: 2026-09-23