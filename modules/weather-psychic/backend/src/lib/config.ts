import { z } from 'zod';

const envSchema = z.object({
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().positive().default(3000),
  MCP_PORT: z.coerce.number().int().positive().default(3001),
  FEED: z.enum(['open-meteo', 'mock']).default('open-meteo'),
  OPEN_METEO_BASE_URL: z.string().url().default('https://api.open-meteo.com'),
  OPEN_METEO_GEOCODING_URL: z.string().url().default('https://geocoding-api.open-meteo.com'),
  FEED_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
  NODE_ENV: z.string().default('development'),
});

/** Parsed, validated runtime configuration (see `docs/configuration.md`). */
export interface Config {
  /** Hostname/interface the servers bind to. */
  host: string;
  /** Port of the REST API (`--http` execution). */
  httpPort: number;
  /** Port of the MCP server (`--mcp` execution). */
  mcpPort: number;
  /** Which feed implementation to use at runtime. */
  feedMode: 'open-meteo' | 'mock';
  /** Base URL of the Open-Meteo forecast endpoint. */
  openMeteoBaseUrl: string;
  /** Base URL of the Open-Meteo geocoding endpoint. */
  openMeteoGeocodingUrl: string;
  /** Timeout in milliseconds for a single provider request. */
  feedTimeoutMs: number;
  /** Log level. */
  logLevel: string;
  /** Runtime environment (`development`, `production`, `test`, ...). */
  env: string;
}

/**
 * Build a {@link Config} from an environment object (defaults to
 * `process.env`). Invalid values throw a zod `ZodError` so misconfiguration
 * fails fast at startup.
 *
 * @param env - environment mapping to parse; defaults to `process.env`
 * @returns the parsed configuration
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.parse(env);
  const envName = parsed.NODE_ENV;
  return {
    host: parsed.HOST,
    httpPort: parsed.PORT,
    mcpPort: parsed.MCP_PORT,
    feedMode: parsed.FEED,
    openMeteoBaseUrl: parsed.OPEN_METEO_BASE_URL,
    openMeteoGeocodingUrl: parsed.OPEN_METEO_GEOCODING_URL,
    feedTimeoutMs: parsed.FEED_TIMEOUT_MS,
    logLevel: parsed.LOG_LEVEL ?? (envName === 'production' ? 'info' : 'debug'),
    env: envName,
  };
}

/** Process-wide configuration, loaded once from the environment at import time. */
export const config = loadConfig();
