# Module-Standard Conformance: weather-psychic

**Feature**: `007-weather-psychic` | **Date**: 2026-10-04 | **Checklist**:
[`specs/004-local-setup-standardization/contracts/module-standard.md`](../004-local-setup-standardization/contracts/module-standard.md)

Self-check against the module-standard conformance checklist for both weather-psychic packages.

| Area | Status | Evidence |
|------|--------|----------|
| base-url | ✅ conformant | `frontend/src/api/baseUrl.ts` (prop > `API_BASE_URL` via `/config.json` > same-origin `/api`); widgets + `LocationSelector` accept a `baseUrl` prop; `baseUrl.test.ts` locks the precedence; `deploy/nginx-entrypoint.d/40-backend-upstream.sh` publishes `/config.json`. |
| documentation | ✅ conformant | `README.md`, `setup.md`, `AGENTS.md` follow the module-standard outline (Overview/Stack/Features/…, Prereqs/Install/Run/…, Purpose/Packages/…); Open-Meteo opt-in external integration documented. |
| workbench | ✅ conformant | Every published component has an interactive story + a written `.mdx` docs page (`WeatherPsychic.mdx`); shared Storybook setup (Tailwind, addon-docs) in `.storybook/main.ts`. |
| tests | ✅ conformant | Component tests (`*.test.tsx`), page-flow tests (`DashboardPage.test.tsx`), backend contract tests for REST **and** MCP including REST ↔ MCP parity; test-first per constitution IV. |
| tooling | ✅ conformant | Port env naming (`PORT`), shared presets intact (`@sousa99/homesweethome-config`), fixed release group registered in `.changeset/config.json`, compose services with host ports `3104/3204/3304/3404`. |

**Notes**:
- The backend is stateless (no DB path in the common data dir applies — not-applicable, matching
  the fly-over-tracker precedent).
- The module intentionally does not require `API_BASE_URL` at build time; base URL is resolved at
  runtime per the base-url contract.