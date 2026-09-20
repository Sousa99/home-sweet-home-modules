---
module: {{MODULE_NAME}}
slug: {{MODULE_SLUG}}
description: {{MODULE_DESCRIPTION}}
home: {{UMBRELLA_LINK}}
packages: {{#if backend}}backend{{/if}}{{#if frontend}} frontend{{/if}}
---

# {{MODULE_NAME}}

[![Part of Home Sweet Home](https://img.shields.io/badge/Home%20Sweet%20Home-Module-blue)]({{UMBRELLA_LINK}})

{{MODULE_DESCRIPTION}}

## 🧰 Stack

| Layer | Technology |
|-------|------------|
{{#if backend}}| Backend | {{STACK_BACKEND}} |
{{/if}}{{#if frontend}}| Frontend | {{STACK_FRONTEND}} |
{{/if}}| Tooling | {{STACK_TOOLING}} |

## 🧰 Prerequisites

- Node.js 24 LTS
- pnpm 11

## 🚀 Setup

```bash
pnpm install
```

See [setup.md](setup.md) for the full module setup guide, quality gates, pipelines, and
package organization. See [docs/clarify.md](docs/clarify.md) for the foundational decisions
to settle when creating this module.

{{#if backend}}
## ⚙️ Backend

One dual-mode package — **REST API** (`{{HTTP_ENTRY}}`) and **MCP server** (`{{MCP_ENTRY}}`)
— sharing the same service/db layer. Package: `{{BACKEND_PACKAGE}}`.

```bash
pnpm --filter ./backend dev          # REST API in dev ({{HTTP_ENTRY}})
pnpm --filter ./backend dev:mcp      # MCP server in dev ({{MCP_ENTRY}})
pnpm --filter ./backend start        # REST API ({{HTTP_ENTRY}})
pnpm --filter ./backend start:mcp    # MCP server ({{MCP_ENTRY}})
```

> Runtime defaults (server name, database filename, ports) are hand-written per module — see
> `docs/clarify.md`.
{{/if}}

{{#if frontend}}
## 🎨 Frontend

One package — **SPA app**, **Storybook workbench**, and a **publishable components library**
— built from the same source. Package: `{{FRONTEND_PACKAGE}}`. Styling uses Tailwind CSS v4
with the Home Sweet Home theme (configurable via `module.config.yaml` → `theme`).

```bash
pnpm --filter ./frontend dev             # SPA dev server
pnpm --filter ./frontend storybook       # Storybook workbench
pnpm --filter ./frontend build           # SPA build (dist-app)
pnpm --filter ./frontend build:lib       # components library (dist-lib)
```
{{/if}}

## 🔒 Quality gates

```bash
pnpm lint       # ESLint
pnpm format     # Prettier check
pnpm test       # Vitest
pnpm typecheck  # tsc --noEmit
pnpm --filter ./frontend build:lib 2>/dev/null; node scripts/scaffold.mjs --check  # template drift check
```

All gates must pass before commit/merge. The `CI` workflow enforces them on every pull
request; merging to `main` triggers the `Release` workflow.

## 🏛️ Governance

See `.specify/memory/constitution.md` for the project's governing principles.