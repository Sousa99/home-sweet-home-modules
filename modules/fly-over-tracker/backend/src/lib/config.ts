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
  // OpenSky OAuth2 client credentials (optional — anonymous when absent).
  OPENSKY_CLIENT_ID: z.string().default(''),
  OPENSKY_CLIENT_SECRET: z.string().default(''),
  OPENSKY_TOKEN_URL: z
    .string()
    .url()
    .default(
      'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token',
    ),
  // Bounded 429/401 retry behaviour (independent budgets per feed).
  RETRY_ATTEMPTS: z.coerce.number().int().positive().default(3),
  RETRY_DEFAULT_MS: z.coerce.number().int().nonnegative().default(2000),
  RETRY_CAP_MS: z.coerce.number().int().positive().default(10000),
  // Destination enrichment tuning.
  DEST_WINDOW_H: z.coerce.number().int().positive().default(24),
  DEST_CONCURRENCY: z.coerce.number().int().positive().default(8),
  DEST_CACHE_TTL_MS: z.coerce.number().int().positive().default(600_000),
  DEST_NEGATIVE_TTL_MS: z.coerce.number().int().positive().default(60_000),
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
  /** OpenSky OAuth2 client id (empty when running anonymously). */
  openskyClientId: string;
  /** OpenSky OAuth2 client secret (empty when running anonymously). */
  openskyClientSecret: string;
  /** OpenSky OAuth2 token endpoint URL. */
  openskyTokenUrl: string;
  /** Bounded number of retry attempts on upstream 429 (and 401). */
  retryAttempts: number;
  /** Default backoff in milliseconds when no retry-after header is present. */
  retryDefaultMs: number;
  /** Upper bound in milliseconds for a single retry wait. */
  retryCapMs: number;
  /** Destination lookup window in hours (clamped to the current UTC day). */
  destinationWindowHours: number;
  /** Maximum number of parallel destination lookups per query. */
  destinationConcurrency: number;
  /** TTL in milliseconds for positive destination cache entries. */
  destinationCacheTtlMs: number;
  /** TTL in milliseconds for negative destination cache entries. */
  destinationNegativeTtlMs: number;
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
    openskyClientId: parsed.OPENSKY_CLIENT_ID,
    openskyClientSecret: parsed.OPENSKY_CLIENT_SECRET,
    openskyTokenUrl: parsed.OPENSKY_TOKEN_URL,
    retryAttempts: parsed.RETRY_ATTEMPTS,
    retryDefaultMs: parsed.RETRY_DEFAULT_MS,
    retryCapMs: parsed.RETRY_CAP_MS,
    destinationWindowHours: parsed.DEST_WINDOW_H,
    destinationConcurrency: parsed.DEST_CONCURRENCY,
    destinationCacheTtlMs: parsed.DEST_CACHE_TTL_MS,
    destinationNegativeTtlMs: parsed.DEST_NEGATIVE_TTL_MS,
    logLevel: parsed.LOG_LEVEL ?? (envName === 'production' ? 'info' : 'debug'),
    env: envName,
  };
}

/**
 * Process-wide configuration, loaded once from the environment at import time.
 */
export const config = loadConfig();
