# Feature Specification: Local Setup & Module Standardization

**Feature Branch**: `feature/004-local-setup-standardization`

**Created**: 2026-09-27

**Status**: Draft

**Input**: User description: "i want to improve the local setup. like i want a docker-compose to launch all the modules. maybe have three options: 1) mcp only, 2) backend rest + spa, 3) backend rest + storybook. for now i think this is it for options but suggest more. i also want you to standardize modules right, for example, spa + components with configurable base url for backend connection, for SPA through env and components through a prop. also standardize their documentation, sotrybook, tests ... evaluate what is needed."

## Clarifications

### Session 2026-09-27

- Q: Should the Docker Compose launch the modules in development mode (live reload, edited sources) or in production-like mode (the existing built images)? → A: Production-like — build and run each module's existing Dockerfile image; no source mounting and no hot reload in the compose environment.
- Q: How should host ports be assigned to the modules so that collisions are structurally impossible while every service keeps a documented address? → A: Fixed, reserved host ports per module (one for REST, one for MCP), collision-free by construction; exact numbers are chosen in planning and documented.
- Q: When the Docker Compose stack stops and starts, should the modules' local data (their SQLite databases) persist across runs or reset to empty? → A: Persist via a documented host directory (bind mount) in a single common data directory shared by all modules; the same common directory is also used by native (non-Docker) local runs.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - One-Command Local Environment (Priority: P1)

As a developer working on multiple Home Sweet Home modules, I launch the whole ecosystem from the repository root with a single command and no manual wiring. I choose between five run modes — (1) MCP only (every module's MCP server), (2) REST + SPA (every module's REST backend with its SPA), (3) REST + Storybook (every module's REST backend with its workbench), (4) full/everything (REST + MCP + SPA + Storybook), and (5) backend only (REST + MCP) — and, in any mode, I can launch all modules or a single chosen module. All the chosen services start together, each reachable at its own documented address, with no port collisions between modules.

**Why this priority**: A unified launch experience is the explicit core ask. Today each service is started individually by hand with `pnpm --filter`; the compose environment removes that friction and makes the ecosystem usable as one system, whether the developer wants one module or all of them.

**Independent Test**: From a clean repo, run the single launch command in each of the five modes — for all modules and for a single chosen module — and confirm every expected service starts and is reachable at its documented address without any per-module configuration.

**Acceptance Scenarios**:

1. **Given** the repository is installed, **When** I run the MCP-only launch, **Then** every module's MCP server starts and is reachable at a unique documented address.
2. **Given** the repository is installed, **When** I run the REST+SPA launch, **Then** every backend-connected module's REST backend starts and its SPA loads and reaches its own backend.
3. **Given** the repository is installed, **When** I run the REST+Storybook launch, **Then** every backend-connected module's REST backend starts and its Storybook workbench loads and can query its own backend.
4. **Given** the repository is installed, **When** I run the full launch, **Then** every module's REST backend, MCP server, SPA, and workbench all start.
5. **Given** the repository is installed, **When** I run the backend-only launch, **Then** every module's REST and MCP backends start and no frontend service starts.
6. **Given** any run mode, **When** I scope it to a single chosen module, **Then** only that module's services for that mode start.
7. **Given** any launch mode or scope, **When** services run together, **Then** no two services collide on the same host port and every address is documented.
8. **Given** a launch mode is already running, **When** I switch to a different mode or scope, **Then** the switch requires no code change and no image rebuild.

---

### User Story 2 - Configurable Backend Connection (Priority: P1)

As a developer, I can point each backend-connected module's SPA at its module's backend through an environment variable, and I can point the module's published data-fetching components and hooks at a backend through a prop. When neither is set, the request targets the same-origin `/api` path, so existing local runs and deployments keep working unchanged.

**Why this priority**: This is the other explicit ask. Today bus-catcher and procrastinator-tracker hardcode the same-origin `/api` path and only fly-over-tracker exposes a base-URL parameter, so embeddable widgets cannot reliably reach a backend. A single convention makes every module's SPA and components behave identically.

**Independent Test**: For each backend-connected module, set the SPA's backend location through an environment variable and verify the SPA talks to the chosen backend; then render the module's published components with a base URL prop and verify they query that backend; then render them without the prop and verify the same-origin fallback.

**Acceptance Scenarios**:

1. **Given** a backend-connected module's SPA, **When** a backend base URL is provided via an environment variable, **Then** all SPA requests target that location.
2. **Given** a backend-connected module's SPA, **When** no backend environment variable is set, **Then** requests target the same-origin `/api` path.
3. **Given** a backend-connected module's data-fetching components or hooks, **When** a backend base URL is passed as a prop, **Then** their requests target that location.
4. **Given** a backend-connected module's data-fetching components or hooks, **When** no base URL prop is passed, **Then** requests target the same-origin `/api` path.
5. **Given** a backend that is down or unreachable, **When** the SPA or a component issues a request, **Then** a clear, user-friendly error is shown and the app does not crash or hang indefinitely.
6. **Given** the module's own development workflow (Vite dev server with proxy), **When** no backend environment variable is set, **Then** the dev experience is unchanged.

---

### User Story 3 - Standardized Module Documentation (Priority: P2)

As a contributor moving between modules, every module's `README.md`, `setup.md`, and `AGENTS.md` follow the same outline and level of detail, so I can find the same information in the same place in any module — overview, stack, features, prerequisites, getting started, quality gates, package/release info, troubleshooting.

**Why this priority**: Consistent docs directly reduce onboarding cost across the ecosystem and make the modules feel like one product. It is valuable but only once the environment and connection conventions exist to document.

**Independent Test**: Open any two modules' README, setup, and AGENTS files and confirm they follow the same section outline, with no section missing or meaningfully out of place.

**Acceptance Scenarios**:

1. **Given** any module, **When** I open its `README.md`, **Then** it contains the standard outline sections in the standard order.
2. **Given** any module, **When** I open its `setup.md`, **Then** it documents prerequisites, run commands, quality gates, and troubleshooting in the standard layout.
3. **Given** any module, **When** I open its `AGENTS.md`, **Then** it documents purpose, packages/layout, common commands, conventions, and agent routing in the standard layout.
4. **Given** the documentation standard, **When** a module's behavior changes (e.g. new run mode, new env var), **Then** the docs describing it are updated in the same change.

---

### User Story 4 - Standardized Component Workbench (Priority: P2)

As a developer evaluating or documenting a module's published components, I get a Storybook workbench in every frontend module that (a) previews every published component with its option combinations and (b) includes a written documentation page per component, using a consistent theme and layout across modules.

**Why this priority**: The workbench is how published components are discovered and verified. Consistency makes any module's components immediately approachable; it matters once components exist in every module to document.

**Independent Test**: Open the workbench of two different modules and verify every published component has a preview and a written docs page, and that the workbench follows the shared visual setup.

**Acceptance Scenarios**:

1. **Given** any frontend module, **When** I open its workbench, **Then** every published component appears with at least one interactive preview.
2. **Given** any frontend module, **When** I open a published component's docs page, **Then** it documents the component's purpose and options with runnable previews.
3. **Given** any two modules' workbenches, **When** I compare them, **Then** they follow the same setup (theme, docs addon, layout conventions).
4. **Given** a workbench running without its backend, **When** I preview a data-fetching component, **Then** it shows a clear loading/error state instead of crashing.

---

### User Story 5 - Standardized Test Conventions (Priority: P2)

As a contributor, every module's test suite follows the same test-first conventions (Vitest + Testing Library) and covers the same levels where applicable — component tests, page/app flow tests, and backend contract tests (REST and MCP) — so the quality gates mean the same thing in every module.

**Why this priority**: Uniform tests make the shared gates meaningful and uphold the constitution's test-first mandate. It is the baseline for trusting cross-module changes, but depends on modules being in place.

**Independent Test**: For two backend-connected modules, run the shared gates and verify each has component, page/app, and backend contract tests, and that a change covered by a failing test is not mergeable.

**Acceptance Scenarios**:

1. **Given** any module, **When** I run its test suite, **Then** it uses the shared Vitest-based conventions and passes the repository gates.
2. **Given** any backend-connected module, **When** I inspect its tests, **Then** both its REST and MCP contracts are covered.
3. **Given** any frontend module, **When** I inspect its tests, **Then** its published components and page flows are covered with the shared Testing Library setup.
4. **Given** the test-first mandate, **When** a behavior change is introduced, **Then** it lands with a test written before the implementation per the repository's TDD workflow.

---

### User Story 6 - Standard Definition & Gap Assessment (Priority: P1)

As a maintainer, I have a written "module standard" that defines the conventions this feature establishes (backend base URL via SPA env / component prop, documentation outline, workbench requirements, test conventions), together with a gap assessment of how each existing module currently differs and what brings it into conformance, so the standardization is explicit, reviewable, and auditable rather than implicit.

**Why this priority**: The user explicitly asked to "evaluate what is needed." Without a written standard and gap assessment, standardization cannot be verified or maintained, and the other stories have no target to conform to.

**Independent Test**: Read the standard document and the per-module gap assessment, then verify each module's conformance status against the checklist it defines.

**Acceptance Scenarios**:

1. **Given** the standard, **When** I read it, **Then** it defines the base URL convention, documentation outline, workbench requirements, and test conventions.
2. **Given** the standard, **When** I read the gap assessment, **Then** it lists each existing module and its conformance status against the standard.
3. **Given** a module claimed as conformant, **When** I check it, **Then** it satisfies every applicable requirement of the standard.

---

### Edge Cases

- All modules launch together and collide on a default port (every backend currently defaults to REST 3000 / MCP 3001) — each module is assigned fixed, reserved host ports (REST and MCP), so collisions are impossible by construction and every address stays stable and documented.
- A module's backend container is not yet ready when its SPA loads — the SPA shows a loading/retry state and does not crash.
- The backend base URL env var is unset — the SPA falls back to the same-origin `/api` path and existing setups keep working.
- The backend base URL env var or prop points to an unreachable or misbehaving host — a clear, user-friendly error is shown, with no silent hang or broken layout.
- A component is embedded with no base URL prop where the parent host does not serve `/api` — the component falls back to same-origin `/api` (documented behavior), not to a guessed URL.
- current-time is frontend-only — the base URL requirement does not apply to it, but the documentation, workbench, and test conventions do.
- The Storybook workbench runs without its backend — data-fetching components show a clear loading/error state rather than crashing.
- A module's published component props change to add the base URL prop — changes are additive and backward-compatible, and any public-surface change follows the release/versioning conventions.
- The docker run modes are switched frequently — switching must not require editing module code or rebuilding images.
- A run mode is scoped to a single module while other modules' containers from a previous all-modules run are still up — the scoped services use the same documented addresses, so no reconfiguration or port juggling is needed.
- A native dev server and the Docker stack run at the same time against the same common data directory — running both concurrently on the same SQLite files is not supported; the documentation states that only one workflow should be active at a time.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The repository MUST provide a single documented command that launches the modules together with Docker.
- **FR-002**: The launch environment MUST support five run modes — MCP only, REST + SPA, REST + Storybook, full (REST + MCP + SPA + Storybook), and backend only (REST + MCP) — and each mode MUST be launchable for all modules or for a single chosen module.
- **FR-003**: When all modules are launched together in any mode, every service MUST be reachable at a unique, documented host address, and there MUST be no port collisions between modules. Each module MUST be assigned fixed, reserved host ports (one for REST, one for MCP) so that collisions are impossible by construction and every address stays stable; the exact numbers are determined in planning and documented.
- **FR-004**: The MCP-only mode MUST make every module's MCP server reachable over the network at a unique, documented address.
- **FR-005**: In the REST + SPA mode, each module's SPA MUST be served and connected to its own module's REST backend.
- **FR-006**: In the REST + Storybook mode, each module's workbench MUST be served and connected to its own module's REST backend.
- **FR-007**: Switching between run modes MUST require no code change and no image rebuild.
- **FR-008**: Every backend-connected module's SPA MUST read its backend base URL from an environment variable, defaulting to the same-origin `/api` path when unset.
- **FR-009**: Every backend-connected module's data-fetching components and hooks MUST accept an optional backend base URL prop, defaulting to the same-origin `/api` path when omitted.
- **FR-010**: The default same-origin `/api` behavior MUST keep the existing per-module dev workflows (e.g. Vite dev server with proxy) working without configuration.
- **FR-011**: When the configured backend is unreachable, the SPA and components MUST surface a clear, user-friendly error without crashing or hanging.
- **FR-012**: The repository MUST publish a written module standard that defines: the backend base URL convention, the documentation outline (README, setup, AGENTS), the workbench requirements, and the test conventions.
- **FR-013**: Each existing module's `README.md`, `setup.md`, and `AGENTS.md` MUST conform to the standard documentation outline.
- **FR-014**: Each frontend module MUST provide a workbench with a preview for every published component and a written documentation page per component, following a consistent setup across modules.
- **FR-015**: Each module's test suite MUST follow the shared test-first conventions (Vitest + Testing Library), covering component, page/app flow, and backend contract (REST and MCP) levels where applicable.
- **FR-016**: The module standard MUST define how it applies to the existing modules — bus-catcher, fly-over-tracker, procrastinator-tracker, and current-time — each in the areas that apply to it (current-time is frontend-only), as recorded in the gap assessment.
- **FR-017**: The repository MUST publish a per-module gap assessment listing each existing module's conformance status against the standard. Bringing existing modules into full conformance is deferred to follow-up work; only low-risk conformance fixes that surface during the assessment and are explicitly accepted for this feature are applied here.
- **FR-018**: All module local data (SQLite databases) MUST live in a single common data directory on the host. The Docker Compose environment MUST persist that directory via a documented host-directory bind mount, and native (non-Docker) local runs MUST use the same common directory, so both workflows read and write the same data.

### Key Entities *(include if feature involves data)*

- **Run mode**: A Docker launch selection that determines which services are started for the modules. Attributes: name (MCP only, REST + SPA, REST + Storybook, full, backend only), scope (all modules or a single chosen module), and the set of services it starts.
- **Backend base URL**: The location of a module's REST API as seen by its SPA and published components. Sources: an environment variable (SPA) or an optional prop (components); default is the same-origin `/api` path.
- **Module standard**: The written convention this feature establishes. Sections: backend base URL convention, documentation outline, workbench requirements, test conventions.
- **Gap assessment**: The per-module record of conformance against the standard. Attributes: module, applicable areas, conformance status, list of changes required.
- **Common data directory**: The single host directory where every module's SQLite database lives, shared by the Docker Compose environment (bind-mounted) and native local runs. Attributes: location (settled in planning and documented), per-module database files.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can start all modules in every supported run mode with a single documented command and no manual per-module configuration.
- **SC-002**: With all modules running together, 100% of launched services are reachable at their documented addresses with zero port collisions.
- **SC-003**: Switching between MCP-only, REST + SPA, and REST + Storybook modes requires no code change and no image rebuild.
- **SC-004**: 100% of backend-connected modules support configuring the SPA backend base URL via an environment variable and the component/hook backend base URL via a prop, with a same-origin `/api` fallback in both cases.
- **SC-005**: A written module standard and a per-module gap assessment covering 100% of existing modules are published and reviewable; any conformance fixes included in this feature are verified against the standard.
- **SC-006**: 100% of published components across modules have an interactive workbench preview and a written documentation page.
- **SC-007**: After standardization, 100% of modules pass the shared quality gates (lint, format, typecheck, tests) with no regressions.
- **SC-008**: Any contributor can locate the same information (overview, run commands, quality gates, troubleshooting) in any module's documentation using the standard outline.
- **SC-009**: Module databases persist across Docker Compose restarts, and native (non-Docker) local runs read and write the same database files through the single common data directory.

## Assumptions

- The launch environment is a Docker Compose file at the repository root that builds on each module's existing Dockerfile image definitions and runs them as-is (production-like): no source mounting and no hot reload inside the compose environment. It is a local developer tool, not a production orchestrator. Iterative per-module development with hot reload continues to use the native `pnpm dev` / `storybook` workflows.
- Because the compose runs built images, switching run modes only selects which already-built services to start; it never triggers a rebuild.
- Each module is assigned fixed, reserved host ports (one for REST, one for MCP) in the compose file; the exact numbers are settled in planning and documented, so addresses never change between runs.
- The location of the common data directory is settled in planning and documented; it sits outside the module source trees so the bind mount and native runs agree on the same files.
- The SPA backend base URL is consumed at container launch time (runtime), not baked in at image build, so a single image works across run modes and targets.
- The "MCP only" mode is viable because the modules' MCP servers already expose a network (HTTP) transport rather than stdio-only.
- The default same-origin `/api` fallback is preserved so existing deployments and dev workflows are unaffected by this feature.
- The base URL prop on published components is additive and backward-compatible; any change to the public package surface follows the repository's changeset/versioning conventions (bumps and releases per module fixed groups).
- current-time is frontend-only and has no backend; the base URL requirements apply only to backend-connected modules, while the documentation, workbench, and test conventions apply to it like any other module.
- "All existing modules" means bus-catcher, fly-over-tracker, procrastinator-tracker, and current-time (the four modules currently in the repository).
- The standardization scope (per clarification Q2): this feature delivers the written module standard and a per-module gap assessment; bringing existing modules into full conformance is follow-up work, though low-risk conformance fixes surfaced by the assessment may be included in this feature where they are straightforward.
- The feature targets the single-household, local-first deployment model from the constitution; the compose environment runs on the developer's own machine.
- No changes are introduced to the constitution's core principles; this feature operationalizes existing conventions (uniform tooling, test-first, module-first).