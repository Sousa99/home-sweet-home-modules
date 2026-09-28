import { afterEach, describe, expect, it, vi } from 'vitest';

const originalDbPath = process.env.DB_PATH;

afterEach(() => {
  if (originalDbPath === undefined) {
    delete process.env.DB_PATH;
  } else {
    process.env.DB_PATH = originalDbPath;
  }
  vi.resetModules();
});

describe('backend config', () => {
  it('defaults dbPath to the repo-root common data directory', async () => {
    delete process.env.DB_PATH;
    vi.resetModules();

    const { config } = await import('./config');

    expect(config.dbPath).toBe('../../data/bus-catcher.db');
  });

  it('keeps the DB_PATH environment variable precedence', async () => {
    process.env.DB_PATH = '/custom/data/bus-catcher.db';
    vi.resetModules();

    const { config } = await import('./config');

    expect(config.dbPath).toBe('/custom/data/bus-catcher.db');
  });
});
