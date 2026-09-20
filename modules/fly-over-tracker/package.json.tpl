{
  "name": "{{MODULE_SLUG}}",
  "version": "0.1.0",
  "private": true,
  "description": "{{MODULE_DESCRIPTION}}",
  "packageManager": "pnpm@11.25.0",
  "engines": {
    "node": ">=24.0.0"
  },
  "scripts": {
    "scaffold": "node scripts/scaffold.mjs",
    "scaffold:check": "node scripts/scaffold.mjs --check",
    "lint": "eslint .",
    "format": "prettier --check .",
    "format:write": "prettier --write .",
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck"{{#if backend}},
    "dev": "pnpm --filter ./backend dev",
    "dev:mcp": "pnpm --filter ./backend dev:mcp",
    "start": "pnpm --filter ./backend start",
    "start:mcp": "pnpm --filter ./backend start:mcp",
    "db:generate": "pnpm --filter ./backend db:generate",
    "db:migrate": "pnpm --filter ./backend db:migrate"{{/if}}{{#if frontend}},
    "dev:web": "pnpm --filter ./frontend dev",
    "storybook": "pnpm --filter ./frontend storybook"{{/if}}
  },
  "devDependencies": {
    "@eslint/js": "^9.17.0",
    "@sousa99/homesweethome-config": "^0.1.0",
    "concurrently": "^9.2.4",
    "eslint": "^9.17.0",
    "eslint-config-prettier": "^9.1.0",
    "globals": "^17.12.0",
    "prettier": "^3.4.0",
    "typescript": "^5.7.0",
    "typescript-eslint": "^8.18.0"
  },
  "dependencies": {
    "yaml": "^2.7.0"
  }
}