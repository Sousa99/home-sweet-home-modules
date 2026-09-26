import { describe, expect, it } from 'vitest';
import { createTestBackend, seedTestFeed } from '../test-utils/db';
import { AppError } from '../lib/errors';

function setup() {
  const backend = createTestBackend();
  seedTestFeed(backend);
  return backend;
}

function expectAppError(fn: () => unknown, status: number, code: string): void {
  try {
    fn();
    expect.unreachable('expected an AppError to be thrown');
  } catch (err) {
    expect(err).toBeInstanceOf(AppError);
    const appError = err as AppError;
    expect(appError.status).toBe(status);
    expect(appError.code).toBe(code);
  }
}

describe('config service', () => {
  it('lists an empty config initially', () => {
    const backend = setup();
    expect(backend.config.listConfig()).toEqual([]);
  });

  it('adds a configured stop with defaults', () => {
    const backend = setup();
    const stop = backend.config.addConfigStop({ stopId: 'S1' });
    expect(stop.stop.id).toBe('S1');
    expect(stop.stop.name).toBe('Av. Teste');
    expect(stop.lineFilter).toEqual([]);
    expect(stop.enabled).toBe(true);
    expect(stop.displayOrder).toBe(0);
  });

  it('rejects an unknown stop', () => {
    const backend = setup();
    expectAppError(() => backend.config.addConfigStop({ stopId: 'NOPE' }), 400, 'unknown_stop');
  });

  it('rejects unknown lines in the filter', () => {
    const backend = setup();
    expectAppError(
      () => backend.config.addConfigStop({ stopId: 'S1', lineFilter: ['999'] }),
      400,
      'unknown_line',
    );
  });

  it('accepts directional line tokens', () => {
    const backend = setup();
    const stop = backend.config.addConfigStop({
      stopId: 'S1',
      lineFilter: ['736:0'],
    });
    expect(stop.lineFilter).toEqual(['736:0']);
  });

  it('rejects a directional token whose direction does not exist', () => {
    const backend = setup();
    expectAppError(
      () => backend.config.addConfigStop({ stopId: 'S1', lineFilter: ['736:1'] }),
      400,
      'unknown_line',
    );
  });

  it('rejects a duplicate stop', () => {
    const backend = setup();
    backend.config.addConfigStop({ stopId: 'S1' });
    expectAppError(() => backend.config.addConfigStop({ stopId: 'S1' }), 409, 'duplicate_stop');
  });

  it('assigns sequential display order', () => {
    const backend = setup();
    const first = backend.config.addConfigStop({ stopId: 'S1' });
    const second = backend.config.addConfigStop({ stopId: 'S2' });
    expect(first.displayOrder).toBe(0);
    expect(second.displayOrder).toBe(1);
  });

  it('stores the line filter', () => {
    const backend = setup();
    const stop = backend.config.addConfigStop({
      stopId: 'S1',
      lineFilter: ['736'],
    });
    expect(stop.lineFilter).toEqual(['736']);
  });

  it('updates a configured stop', () => {
    const backend = setup();
    const added = backend.config.addConfigStop({ stopId: 'S1' });
    const updated = backend.config.updateConfigStop(added.id, {
      enabled: false,
      lineFilter: ['706'],
    });
    expect(updated.enabled).toBe(false);
    expect(updated.lineFilter).toEqual(['706']);
  });

  it('throws 404 when updating an unknown config id', () => {
    const backend = setup();
    expectAppError(
      () => backend.config.updateConfigStop(999, { enabled: false }),
      404,
      'not_found',
    );
  });

  it('removes a configured stop', () => {
    const backend = setup();
    const added = backend.config.addConfigStop({ stopId: 'S1' });
    backend.config.removeConfigStop(added.id);
    expect(backend.config.listConfig()).toEqual([]);
  });

  it('throws 404 when removing an unknown config id', () => {
    const backend = setup();
    expectAppError(() => backend.config.removeConfigStop(999), 404, 'not_found');
  });

  it('updates displayOrder to reorder stops', () => {
    const backend = setup();
    const first = backend.config.addConfigStop({ stopId: 'S1' });
    const second = backend.config.addConfigStop({ stopId: 'S2' });
    const reordered = backend.config.updateConfigStop(first.id, {
      displayOrder: second.displayOrder,
    });
    backend.config.updateConfigStop(second.id, { displayOrder: first.displayOrder });
    const list = backend.config.listConfig();
    expect(reordered.displayOrder).toBe(second.displayOrder);
    expect(list.map((s) => s.stop.id)).toEqual(['S2', 'S1']);
  });

  it('flags a configured stop whose stop vanished from the feed as missing', () => {
    const backend = setup();
    const added = backend.config.addConfigStop({ stopId: 'S1', lineFilter: ['736'] });
    // simulate a refreshed feed that no longer contains stop S1
    backend.sqlite.pragma('foreign_keys = OFF');
    backend.sqlite.prepare('DELETE FROM stops WHERE id = ?').run('S1');

    const list = backend.config.listConfig();
    expect(list).toHaveLength(1);
    expect(list[0]?.missing).toBe(true);
    expect(list[0]?.stop.id).toBe('S1');
    expect(list[0]?.lineFilter).toEqual(['736']);
    expect(list[0]?.id).toBe(added.id);

    const single = backend.config.getConfigStop(added.id);
    expect(single?.missing).toBe(true);
  });

  it('still updates and removes a missing configured stop', () => {
    const backend = setup();
    const added = backend.config.addConfigStop({ stopId: 'S1' });
    backend.sqlite.pragma('foreign_keys = OFF');
    backend.sqlite.prepare('DELETE FROM stops WHERE id = ?').run('S1');

    const updated = backend.config.updateConfigStop(added.id, { enabled: false });
    expect(updated.missing).toBe(true);
    expect(updated.enabled).toBe(false);

    backend.config.removeConfigStop(added.id);
    expect(backend.config.listConfig()).toEqual([]);
  });

  it('resolves default thresholds (10/5/1) when none are set', () => {
    const backend = setup();
    const stop = backend.config.addConfigStop({ stopId: 'S1' });
    expect(stop.thresholds).toEqual({
      headsUpMinutes: 10,
      leaveNowMinutes: 5,
      missedMinutes: 1,
    });
  });

  it('persists explicit thresholds on create and returns them on read', () => {
    const backend = setup();
    const added = backend.config.addConfigStop({
      stopId: 'S2',
      thresholds: { headsUpMinutes: 12, leaveNowMinutes: 6, missedMinutes: 2 },
    });
    expect(added.thresholds).toEqual({
      headsUpMinutes: 12,
      leaveNowMinutes: 6,
      missedMinutes: 2,
    });

    const listed = backend.config.listConfig().find((s) => s.stop.id === 'S2');
    expect(listed?.thresholds).toEqual({
      headsUpMinutes: 12,
      leaveNowMinutes: 6,
      missedMinutes: 2,
    });
  });

  it('updates a single threshold field while keeping the others', () => {
    const backend = setup();
    const added = backend.config.addConfigStop({
      stopId: 'S1',
      thresholds: { headsUpMinutes: 12, leaveNowMinutes: 6, missedMinutes: 2 },
    });
    const updated = backend.config.updateConfigStop(added.id, {
      thresholds: { missedMinutes: 3 },
    });
    expect(updated.thresholds).toEqual({
      headsUpMinutes: 12,
      leaveNowMinutes: 6,
      missedMinutes: 3,
    });
  });

  it('rejects negative threshold values on create', () => {
    const backend = setup();
    expectAppError(
      () =>
        backend.config.addConfigStop({
          stopId: 'S1',
          thresholds: { headsUpMinutes: 10, leaveNowMinutes: 5, missedMinutes: -1 },
        }),
      400,
      'invalid_body',
    );
  });

  it('rejects out-of-order threshold values on create', () => {
    const backend = setup();
    expectAppError(
      () =>
        backend.config.addConfigStop({
          stopId: 'S1',
          thresholds: { headsUpMinutes: 3, leaveNowMinutes: 6, missedMinutes: 2 },
        }),
      400,
      'invalid_body',
    );
  });

  it('rejects an update whose thresholds break ordering against stored values', () => {
    const backend = setup();
    const added = backend.config.addConfigStop({
      stopId: 'S1',
      thresholds: { headsUpMinutes: 12, leaveNowMinutes: 6, missedMinutes: 2 },
    });
    expectAppError(
      () =>
        backend.config.updateConfigStop(added.id, {
          thresholds: { headsUpMinutes: 3 },
        }),
      400,
      'invalid_body',
    );
  });
});
