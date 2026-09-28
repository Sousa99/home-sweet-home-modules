import { describe, expect, it } from 'vitest';
import { createDb } from '../../src/db/client';

describe('createDb', () => {
  it('sets a busy timeout so concurrent first-run migrations do not fail with SQLITE_BUSY', () => {
    const { sqlite } = createDb(':memory:');
    expect(sqlite.pragma('busy_timeout', { simple: true })).toBe(5000);
    sqlite.close();
  });
});
