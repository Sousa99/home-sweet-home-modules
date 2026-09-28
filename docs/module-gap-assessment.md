# Home Sweet Home — Module Gap Assessment

**Spec**: `specs/004-local-setup-standardization/spec.md` | **Date**: 2026-09-27

Records each existing module's conformance against [docs/module-standard.md](module-standard.md).
Status values: `conformant` / `non-conformant` / `partial` / `not-applicable`. Bringing modules into
full conformance is **deferred follow-up work** (spec clarification Q2:C); only the low-risk
conformance fixes required by the Docker Compose environment landed in this feature (nginx `/api`
proxy + env-templated upstream, Storybook images, image-level migration data).

## Conformance matrix

| Module | Base URL (SPA env / component prop) | Documentation | Workbench | Tests | Tooling |
|--------|-------------------------------------|---------------|-----------|-------|---------|
| bus-catcher | non-conformant (both missing) | non-conformant | conformant | conformant | partial (`DB_PATH` default not the common dir) |
| fly-over-tracker | partial (prop only — `getFlyOvers(query, baseUrl)`) | conformant | conformant | conformant | non-conformant (`HTTP_PORT` vs `PORT`) |
| procrastinator-tracker | non-conformant (both missing) | non-conformant | conformant | conformant | partial (`DATABASE_URL` default not the common dir) |
| current-time | not-applicable (frontend-only) | conformant | conformant | conformant | conformant |

## Deferred conformance items

### Base URL (bus-catcher, procrastinator-tracker; fly-over-tracker partial)

- Add the SPA runtime `API_BASE_URL` env read (runtime-injected, default same-origin `/api`) —
  FR-008.
- Add the optional `baseUrl` prop to every data-fetching component/hook — FR-009 (fly-over-tracker
  already conforms on the prop).
- Keep the same-origin fallback and the existing Vite dev proxy working — FR-010.
- Document the behavior of an unreachable configured backend (clear error, no crash) — FR-011.

### Tooling

- Unify the backend REST port env var: fly-over-tracker uses `HTTP_PORT`, bus-catcher and
  procrastinator-tracker use `PORT`. Standardize on `PORT` (aliasing `HTTP_PORT`) so all backends
  read the same variable.
- Point native-run DB defaults (`DB_PATH`, `DATABASE_URL`) at the root common `data/` directory so
  native (non-Docker) runs and the Docker Compose stack share the same database files — FR-018
  native half.

### Documentation

- bus-catcher and procrastinator-tracker `README.md`, `setup.md`, `AGENTS.md` need to move to the
  standard outline (current-time is the reference). fly-over-tracker conforms.

## Applied in this feature (low-risk, compose-required)

- Each backend-connected module's SPA/Storybook nginx gained an env-templated `/api` reverse proxy
  (`BACKEND_UPSTREAM`); empty ⇒ same-origin, no proxy.
- New `Dockerfile.storybook` per frontend module.
- Image-level fixes so backends can run on a fresh database: bus-catcher ships its `drizzle/`
  migrations; procrastinator-tracker ships its `drizzle/` migrations and the Compose runs
  `node dist/migrate.js` before startup.
- Module Dockerfiles tolerate a missing `npm_token` build secret (local zero-config builds; CI can
  still pass it).