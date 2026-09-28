# Home Sweet Home — Module Standard

**Version**: 0.1.0 | **Spec**: `specs/004-local-setup-standardization/spec.md`

This document is the written standard every Home Sweet Home module conforms to. It defines the
identity/layout conventions, the backend base-URL convention, the documentation outline, the
workbench requirements, and the test conventions. Conformance per module is recorded in
[docs/module-gap-assessment.md](module-gap-assessment.md).

The standard extends, and never contradicts, the repository constitution
(`.specify/memory/constitution.md`) and the shared tooling presets in
`@sousa99/homesweethome-config`.

## 1. Identity & layout

- Package identity is declared in each package's `package.json` as `@sousa99/<slug>-*`, and the
  directory name `modules/<slug>/` matches the prefix (constitution III).
- Standard module shape:

  ```text
  modules/<slug>/
  ├── backend/                      @sousa99/<slug>-backend  — dual-mode REST (--http) + MCP (--mcp)
  ├── frontend/                     @sousa99/<slug>-components — SPA + Storybook + components library
  ├── Dockerfile.backend / Dockerfile.frontend / Dockerfile.storybook
  ├── deploy/                       nginx confs + templates + entrypoint scripts
  ├── docs/                         module guides
  ├── README.md / setup.md / AGENTS.md
  ├── eslint.config.mjs / prettier.config.mjs / tsconfig.base.json   (shared presets)
  ```

- Frontend-only modules (e.g. current-time) omit `backend/`, `Dockerfile.backend`, and the
  backend/MCP Docker Compose services.

## 2. Backend base URL

Every backend-connected module resolves where its REST API lives through a single convention:

**Precedence**: component/hook `baseUrl` prop > SPA runtime `API_BASE_URL` env > same-origin `/api`.

- **SPA**: reads `API_BASE_URL` at runtime (not baked into the bundle). Default empty ⇒ requests
  target the same-origin `/api` path, keeping the Vite dev proxy and every existing deployment
  working unchanged.
- **Components/hooks**: accept an optional `baseUrl?: string` prop. Default `''` ⇒ same-origin
  `/api`. The prop is additive and backward-compatible; public-surface changes follow the module's
  changeset/versioning conventions.
- **Failure**: an unreachable configured backend surfaces a clear, user-friendly error — no crash,
  no silent hang.

See `specs/004-local-setup-standardization/contracts/base-url.md` for the full contract.

## 3. Documentation outline

Every module's documentation follows a fixed section order.

### `README.md`

1. Overview — what the module does, in one or two paragraphs
2. Stack — technology table
3. Features — the user-facing capabilities
4. Prerequisites
5. Getting Started — run commands (from the repo root, `pnpm --filter` and/or Docker Compose)
6. Quality Gates — test/typecheck/build commands
7. Package — published packages, registry, public surface, embedding example (if components)
8. Learn More — pointers to `setup.md`, `AGENTS.md`, repo root

### `setup.md`

1. Prerequisites
2. Install
3. Run — backend (REST + MCP) and frontend (SPA + workbench)
4. Quality Gates
5. Manual Validation — numbered runnable checks
6. Project Layout
7. Troubleshooting
8. Versioning & Releases

### `AGENTS.md`

1. Purpose
2. Packages & layout
3. Common commands (from the repo root)
4. Conventions & quality gates
5. Agent & skill routing
6. Codebase orientation (key files)

## 4. Workbench requirements

- Every **published component** has an interactive Storybook story covering its option matrix
  (presentations × options).
- Every published component has a **written documentation page** (`.mdx`) describing its purpose,
  props, and options with runnable previews.
- All modules share the same Storybook setup: the Home Sweet Home theme, addon-docs, Tailwind
  CSS v4, and the `build-storybook` script outputting `dist-storybook/`.
- Each module ships a `Dockerfile.storybook` that serves `dist-storybook` with the same nginx
  setup as the SPA (including the optional `/api` proxy), so the workbench can query its own
  backend in the Docker Compose environment.

## 5. Test conventions

- **Test-first (non-negotiable)**: behavior changes start with a failing Vitest test, then the
  implementation, then a green run (constitution IV).
- **Levels**, where applicable:
  - component tests (Testing Library + jsdom)
  - page/app-flow tests (Testing Library)
  - backend contract tests — **both** REST and MCP surfaces (dual-mode parity, constitution V)
- Vitest is the only test runner; suites run through the shared workspace `pnpm test`.
- A behavior change on a module's REST or MCP contract must be covered on both surfaces before
  merge.