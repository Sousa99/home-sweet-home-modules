{
  "name": "{{BACKEND_PACKAGE}}",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=24.0.0"
  },
  "scripts": {
    "dev": "tsx watch src/index.ts --http",
    "dev:mcp": "tsx watch src/index.ts --mcp",
    "start": "tsx src/index.ts --http",
    "start:mcp": "tsx src/index.ts --mcp",
    "build": "esbuild src/index.ts --bundle --platform=node --format=esm --packages=external --outfile=dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "esbuild": "^0.28.2",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}