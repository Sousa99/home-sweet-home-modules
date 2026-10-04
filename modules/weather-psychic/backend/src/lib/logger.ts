import { pino, type Logger } from 'pino';
import { loadConfig } from './config';

export interface CreateLoggerOptions {
  /** Override the environment used to pick the output style. */
  env?: string;
  /** Override the log level. */
  level?: string;
}

/**
 * Create a pino logger tuned for the current environment:
 *
 * - `test`: level `silent` — no output (unit tests stay quiet and fast).
 * - `production`: structured JSON lines, suitable for log aggregation.
 * - otherwise (development): human-readable, colorized output via
 *   `pino-pretty`, at the configured level (default `debug`).
 */
export function createLogger(options: CreateLoggerOptions = {}): Logger {
  const cfg = loadConfig();
  const env = options.env ?? cfg.env;
  const level = options.level ?? cfg.logLevel;

  if (env === 'test') {
    return pino({ level: 'silent' });
  }
  if (env === 'production') {
    return pino({ level });
  }
  return pino({
    level,
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  });
}

/** Process-wide logger, created once at import time from the environment. */
export const logger = createLogger();
