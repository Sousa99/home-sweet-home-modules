import { z } from 'zod';

/**
 * Default maximum query radius in kilometers.
 *
 * A query with a larger radius is rejected by the shared location query schema
 * (see {@link createLocationQuerySchema}). Bounded by the adsb.lol `/v2/point`
 * endpoint's 250 nm (~463 km) radius cap.
 */
export const DEFAULT_MAX_RADIUS_KM = 463;

const PINO_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

const envSchema = z.object({
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().positive().default(3000),
  // Backward-compatible alias for PORT; wins when both are set.
  HTTP_PORT: z.coerce.number().int().positive().optional(),
  MCP_PORT: z.coerce.number().int().positive().default(3001),
  MAX_RADIUS_KM: z.coerce.number().positive().default(DEFAULT_MAX_RADIUS_KM),
  ADSB_BASE_URL: z.string().url().default('https://api.adsb.lol'),
  ADSB_ROUTE_BASE_URL: z.string().url().default('https://vrs-standing-data.adsb.lol'),
  FEED_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  FEED: z.enum(['adsb', 'mock']).default('adsb'),
  LOG_LEVEL: z.enum(PINO_LEVELS).optional(),
  NODE_ENV: z.string().default('development'),
  // Bounded 429 retry behaviour for the adsb.lol feeds.
  RETRY_ATTEMPTS: z.coerce.number().int().positive().default(3),
  RETRY_DEFAULT_MS: z.coerce.number().int().nonnegative().default(2000),
  RETRY_CAP_MS: z.coerce.number().int().positive().default(10000),
  // Destination route cache tuning.
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
  /** Port of the REST API (`--http` execution). Standardized on `PORT`;
   * `HTTP_PORT` remains a backward-compatible alias and wins when both are set. */
  httpPort: number;
  /** Port of the MCP server (`--mcp` execution). */
  mcpPort: number;
  /** Maximum accepted query radius in kilometers. */
  maxRadiusKm: number;
  /** Base URL of the aircraft position/route feed. */
  feedBaseUrl: string;
  /** Base URL of the adsb.lol standing-data route files. */
  routeBaseUrl: string;
  /** Timeout in milliseconds for a single feed request. */
  feedTimeoutMs: number;
  /** Which feed implementation to use at runtime. */
  feedMode: 'adsb' | 'mock';
  /** Bounded number of retry attempts on upstream 429. */
  retryAttempts: number;
  /** Default backoff in milliseconds when no retry-after header is present. */
  retryDefaultMs: number;
  /** Upper bound in milliseconds for a single retry wait. */
  retryCapMs: number;
  /** TTL in milliseconds for positive destination route cache entries. */
  destinationCacheTtlMs: number;
  /** TTL in milliseconds for negative destination route cache entries. */
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
    httpPort: parsed.HTTP_PORT ?? parsed.PORT,
    mcpPort: parsed.MCP_PORT,
    maxRadiusKm: parsed.MAX_RADIUS_KM,
    feedBaseUrl: parsed.ADSB_BASE_URL,
    routeBaseUrl: parsed.ADSB_ROUTE_BASE_URL,
    feedTimeoutMs: parsed.FEED_TIMEOUT_MS,
    feedMode: parsed.FEED,
    retryAttempts: parsed.RETRY_ATTEMPTS,
    retryDefaultMs: parsed.RETRY_DEFAULT_MS,
    retryCapMs: parsed.RETRY_CAP_MS,
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
