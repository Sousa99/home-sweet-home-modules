# @sousa99/homesweethome-config

Shared tooling presets for every Home Sweet Home module — one set of ESLint, Prettier, and
TypeScript rules so every package in the monorepo behaves identically.

## Exports

| Import path | What it provides |
|-------------|------------------|
| `@sousa99/homesweethome-config/eslint` | ESLint flat config (recommended rules + TypeScript + Prettier integration) |
| `@sousa99/homesweethome-config/prettier` | Prettier options (single quotes, semicolons, print width 100, LF) |
| `@sousa99/homesweethome-config/tsconfig.base` | Base TypeScript compiler options (strict, ESNext, bundler resolution) |

## Usage

Every module and the repository root wire the presets through tiny config files:

```js
// eslint.config.mjs
import config from '@sousa99/homesweethome-config/eslint';
export default [...config];
```

```js
// prettier.config.mjs
import config from '@sousa99/homesweethome-config/prettier';
export default config;
```

```json
// tsconfig.json
{ "extends": "@sousa99/homesweethome-config/tsconfig.base", "compilerOptions": {} }
```

Inside the monorepo the package is consumed via the `workspace:*` protocol, so every
module resolves the same local presets.

## Peer dependencies

Consumers must install the peer dependencies: `@eslint/js`, `eslint`,
`eslint-config-prettier`, `globals`, `prettier`, `typescript`, `typescript-eslint`.

## Release

This package versions and publishes **independently** of the modules via changesets (it is
not part of any module's fixed group).