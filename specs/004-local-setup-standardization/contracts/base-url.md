# Contract: Backend Base URL (SPA env + component prop)

**Date**: 2026-09-27 | **Plan**: [../plan.md](../plan.md)

The standardized way every backend-connected module resolves where its REST API lives (FR-008,
FR-009). This contract is part of the module standard (FR-012); full conformance is deferred per
Q2:C and tracked in the gap assessment.

## Resolution order

1. **Component/hook prop** `baseUrl` (when the caller is a published component or hook).
2. **SPA runtime env** `API_BASE_URL` (when the caller is the SPA app).
3. **Same-origin default** `''` ⇒ requests target the same-origin `/api` path.

Precedence: `baseUrl` prop > `API_BASE_URL` env > same-origin `/api`.

## SPA contract

- Env var: `API_BASE_URL`, consumed at runtime (not baked into the bundle at build).
- Value semantics: absolute URL (e.g. `http://localhost:3100`) or empty ⇒ same-origin `/api`.
- Default when unset: same-origin `/api` — keeps the existing Vite dev proxy and every current
  deployment working unchanged (FR-010).
- Failure: an unreachable configured base URL must surface a clear, user-friendly error; no crash,
  no silent hang (FR-011).

## Component / hook contract

- Prop: `baseUrl?: string` — optional, additive, backward-compatible (no existing consumer breaks).
- Default when omitted: `''` ⇒ same-origin `/api`.
- Applies to every data-fetching component and hook a module publishes (e.g. fly-over-tracker's
  `getFlyOvers(query, baseUrl)` already conforms).
- Any public-surface change follows the module's changeset/versioning conventions (bumps per fixed
  release group).

## Current conformance (gap assessment input)

| Module | SPA env | Component prop |
|--------|---------|----------------|
| bus-catcher | conformant (`configureApiBaseUrl` + `/config.json`) | conformant (`StopCard.baseUrl`) |
| fly-over-tracker | conformant | conformant (`FlyOverWidget`/`ClosestAircraftCard.baseUrl`, `getFlyOvers`) |
| procrastinator-tracker | conformant | conformant (`TaskDeckWrapper.baseUrl`) |
| current-time | N/A (frontend-only) | N/A |