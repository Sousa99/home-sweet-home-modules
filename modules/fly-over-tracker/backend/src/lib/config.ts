import { z } from 'zod';

/**
 * Default maximum query radius in kilometers.
 *
 * A query with a larger radius is rejected by the shared location query schema
 * (see {@link createLocationQuerySchema}). Hand-written runtime default per
 * `docs/clarify.md` (FR-012).
 */
export const DEFAULT_MAX_RADIUS_KM = 500;

const PINO_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

const envSchema = z.object({
  HOST: z.string().default('127.0.0.1'),
  HTTP_PORT: z.coerce.number().int().positive().default(3000),
  MCP_PORT: z.coerce.number().int().positive().default(3001),
  MAX_RADIUS_KM: z.coerce.number().positive().default(DEFAULT_MAX_RADIUS_KM),
  OPENSKY_BASE_URL: z.string().url().default('https://opensky-network.org'),
  FEED_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  FEED: z.enum(['opensky', 'mock']).default('opensky'),
  LOG_LEVEL: z.enum(PINO_LEVELS).optional(),
  NODE_ENV: z.string().default('development'),
});

/**
 * Parsed, validated runtime configuration.
 *
 * All values carry a hand-written default and can be overridden through the
 * environment. Loaded once at startup and passed explicitly where needed so the
 * code stays testable.
 */
export interface Config {
  /** Hostname/interface the servers bind to. */
  host: string;
  /** Port of the REST API (`--http` execution). */
  httpPort: number;
  /** Port of the MCP server (`--mcp` execution). */
  mcpPort: number;
  /** Maximum accepted query radius in kilometers. */
  maxRadiusKm: number;
  /** Base URL of the aircraft position feed. */
  feedBaseUrl: string;
  /** Timeout in milliseconds for a single feed request. */
  feedTimeoutMs: number;
  /** Which feed implementation to use at runtime. */
  feedMode: 'opensky' | 'mock';
  /** pino log level. */
  logLevel: string;
  /** Runtime environment (`development`, `production`, `test`, ...). */
  env: string;
}

/**
 * Build a {@link Config} from an environment object (defaults to
 * `process.env`). Invalid values (e.g. non-numeric ports, unknown feed mode)
 * throw a zod `ZodError` so misconfiguration fails fast at startup.
 *
 * @param env - environment mapping to parse; defaults to `process.env`
 * @returns the parsed configuration
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.parse(env);
  const envName = parsed.NODE_ENV;
  return {
    host: parsed.HOST,
    httpPort: parsed.HTTP_PORT,
    mcpPort: parsed.MCP_PORT,
    maxRadiusKm: parsed.MAX_RADIUS_KM,
    feedBaseUrl: parsed.OPENSKY_BASE_URL,
    feedTimeoutMs: parsed.FEED_TIMEOUT_MS,
    feedMode: parsed.FEED,
    logLevel: parsed.LOG_LEVEL ?? (envName === 'production' ? 'info' : 'debug'),
    env: envName,
  };
}

/**
 * Process-wide configuration, loaded once from the environment at import time.
 */
export const config = loadConfig();
