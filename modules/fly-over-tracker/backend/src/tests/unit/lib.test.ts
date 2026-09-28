import { describe, expect, it } from 'vitest';
import { DEFAULT_MAX_RADIUS_KM, loadConfig } from '../../lib/config';
import { createLogger } from '../../lib/logger';
import {
  AppError,
  FeedUnavailableError,
  ValidationError,
  errorStatus,
  toErrorResponse,
} from '../../lib/errors';

describe('config', () => {
  it('applies hand-written defaults for an empty environment', () => {
    const cfg = loadConfig({});
    expect(cfg.host).toBe('127.0.0.1');
    expect(cfg.httpPort).toBe(3000);
    expect(cfg.mcpPort).toBe(3001);
    expect(cfg.maxRadiusKm).toBe(DEFAULT_MAX_RADIUS_KM);
    expect(cfg.feedBaseUrl).toBe('https://api.adsb.lol');
    expect(cfg.routeBaseUrl).toBe('https://vrs-standing-data.adsb.lol');
    expect(cfg.feedTimeoutMs).toBe(8000);
    expect(cfg.feedMode).toBe('adsb');
    expect(cfg.env).toBe('development');
    expect(cfg.logLevel).toBe('debug');
  });

  it('honors environment overrides', () => {
    const cfg = loadConfig({
      HOST: '0.0.0.0',
      HTTP_PORT: '4100',
      MCP_PORT: '4101',
      MAX_RADIUS_KM: '250',
      ADSB_BASE_URL: 'https://example.com',
      FEED_TIMEOUT_MS: '5000',
      FEED: 'mock',
      LOG_LEVEL: 'warn',
      NODE_ENV: 'production',
    });
    expect(cfg.host).toBe('0.0.0.0');
    expect(cfg.httpPort).toBe(4100);
    expect(cfg.mcpPort).toBe(4101);
    expect(cfg.maxRadiusKm).toBe(250);
    expect(cfg.feedBaseUrl).toBe('https://example.com');
    expect(cfg.feedTimeoutMs).toBe(5000);
    expect(cfg.feedMode).toBe('mock');
    expect(cfg.logLevel).toBe('warn');
    expect(cfg.env).toBe('production');
  });

  it('defaults log level to info in production', () => {
    expect(loadConfig({ NODE_ENV: 'production' }).logLevel).toBe('info');
  });

  it('reads the REST port from PORT when HTTP_PORT is not set', () => {
    expect(loadConfig({ PORT: '4200' }).httpPort).toBe(4200);
  });

  it('keeps HTTP_PORT as a backward-compatible alias that wins over PORT', () => {
    expect(loadConfig({ PORT: '4300', HTTP_PORT: '4100' }).httpPort).toBe(4100);
  });

  it('rejects invalid values with a parse error', () => {
    expect(() => loadConfig({ HTTP_PORT: 'abc' })).toThrow();
    expect(() => loadConfig({ PORT: 'abc' })).toThrow();
    expect(() => loadConfig({ FEED: 'bogus' })).toThrow();
    expect(() => loadConfig({ LOG_LEVEL: 'shout' })).toThrow();
  });
});

describe('logger', () => {
  it('is silent in the test environment', () => {
    expect(createLogger({ env: 'test' }).level).toBe('silent');
  });

  it('uses JSON mode with the requested level in production', () => {
    expect(createLogger({ env: 'production', level: 'info' }).level).toBe('info');
  });

  it('uses the pretty transport at the requested level in development', () => {
    expect(createLogger({ env: 'development', level: 'debug' }).level).toBe('debug');
  });
});

describe('errors', () => {
  it('maps a validation error to 400 with per-field details', () => {
    const err = new ValidationError('Invalid request', [
      { field: 'lat', message: 'lat must be between -90 and 90' },
    ]);
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe('validation_error');
    expect(errorStatus(err)).toBe(400);
    expect(toErrorResponse(err)).toEqual({
      success: false,
      message: 'Invalid request',
      errors: [{ field: 'lat', message: 'lat must be between -90 and 90' }],
    });
  });

  it('maps a non-retryable feed error to 502', () => {
    const err = new FeedUnavailableError('Feed is down');
    expect(err.code).toBe('feed_unavailable');
    expect(errorStatus(err)).toBe(502);
    expect(toErrorResponse(err)).toEqual({
      success: false,
      message: 'Feed is down',
    });
  });

  it('maps a retryable feed error to 503 with a rate_limited code', () => {
    const err = new FeedUnavailableError('Rate limited', {
      retryable: true,
    });
    expect(err.code).toBe('rate_limited');
    expect(errorStatus(err)).toBe(503);
  });

  it('masks unknown errors as an internal 500', () => {
    expect(errorStatus(new Error('boom'))).toBe(500);
    expect(toErrorResponse(new Error('boom'))).toEqual({
      success: false,
      message: 'Unexpected internal error',
    });
  });
});
