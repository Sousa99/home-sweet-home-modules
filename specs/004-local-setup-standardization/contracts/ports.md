# Contract: Fixed Host Port Allocation

**Date**: 2026-09-27 | **Plan**: [../plan.md](../plan.md)

Collision-free by construction (FR-003, clarification Q2:A). Every module owns a reserved host-port
block; no port is shared between modules or service kinds. Inside the Compose network, containers
keep their defaults (backends listen on 3000, MCP on 3001); only host mappings are shown here.

Scheme: REST `31xx`, MCP `32xx`, SPA `33xx`, Storybook `34xx` — indexed by module slug.

| Module | REST (host) | MCP (host) | SPA (host) | Storybook (host) |
|--------|-------------|------------|------------|------------------|
| bus-catcher | `3100` | `3200` | `3300` | `3400` |
| fly-over-tracker | `3101` | `3201` | `3301` | `3401` |
| procrastinator-tracker | `3102` | `3202` | `3302` | `3402` |
| current-time | — | — | `3303` | `3403` |
| weather-psychic | `3104` | `3204` | `3304` | `3404` |

Rules:

1. Every cell is a distinct host port → zero collisions across all modules and all modes (FR-003).
2. The `3x` ranges are disjoint from native-dev defaults (REST 3000, MCP 3001, Vite 5173,
   Storybook 6006), so a Compose stack and native dev servers can run side by side.
3. Ports are overridable through the Compose environment surface (`.env`), preserving the fixed
   default while allowing local conflicts to be resolved without editing `docker-compose.yml`.
4. These exact numbers are the planning-time resolution of clarification Q2:A; they are documented
   here and in `docs/module-gap-assessment.md`'s tooling notes.