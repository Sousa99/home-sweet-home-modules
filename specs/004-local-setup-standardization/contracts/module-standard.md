# Contract: Module Standard (outline + conformance checklist)

**Date**: 2026-09-27 | **Plan**: [../plan.md](../plan.md)

Defines the written module standard deliverable (FR-012). The published document lives at
`docs/module-standard.md`; this contract fixes its outline and the conformance checklist used by the
gap assessment (FR-016/FR-017).

## Document outline

1. **Identity & layout** — directory/package naming (`@sousa99/<slug>-*`), module shape
   (backend/, frontend/, Dockerfiles, deploy/, docs/), per constitution III.
2. **Backend base URL** — the [base-url contract](base-url.md): prop > env > same-origin `/api`.
3. **Documentation outline** — mandatory section order for `README.md`, `setup.md`, `AGENTS.md`:

   | File | Sections (in order) |
   |------|---------------------|
   | README | Overview, Stack, Features, Prerequisites, Getting Started, Quality Gates, Package, Embedding (if components), Learn More |
   | setup.md | Prerequisites, Install, Run (backend / frontend / workbench), Quality Gates, Manual Validation, Project Layout, Troubleshooting, Versioning |
   | AGENTS.md | Purpose, Packages & layout, Common commands, Conventions & quality gates, Agent & skill routing, Codebase orientation |

4. **Workbench requirements** — every published component has an interactive story (covering its
   option matrix) and a written `.mdx` docs page; shared Storybook setup (theme, addon-docs,
   Tailwind) across modules (FR-014).
5. **Test conventions** — Vitest + Testing Library; three levels where applicable: component,
   page/app flow, backend contract (REST **and** MCP both); test-first per constitution IV (FR-015).

## Conformance checklist

For each module, assess every applicable area: `conformant` / `non-conformant` / `not-applicable`.

| Area | Criterion |
|------|-----------|
| base-url | SPA reads `API_BASE_URL`; components/hooks accept `baseUrl`; same-origin default works |
| documentation | README / setup / AGENTS follow the outline above |
| workbench | every published component has a story + `.mdx` docs page; shared setup |
| tests | component, page-flow, backend contract (REST + MCP) coverage; test-first |
| tooling | port env naming (`PORT`), DB path in the common data dir, shared presets intact |

## Expected conformance snapshot (initial gap assessment)

| Module | base-url | documentation | workbench | tests | tooling |
|--------|----------|---------------|-----------|-------|---------|
| bus-catcher | conformant | non-conformant (pending) | conformant | conformant | conformant (DB default → `data/`) |
| fly-over-tracker | conformant | conformant | conformant | conformant | conformant (`PORT` unified) |
| procrastinator-tracker | conformant | non-conformant (pending) | conformant | conformant | conformant (DB default → `data/`) |
| current-time | N/A | conformant | conformant | conformant | conformant |

Deferred changes required per module are listed in `docs/module-gap-assessment.md`.