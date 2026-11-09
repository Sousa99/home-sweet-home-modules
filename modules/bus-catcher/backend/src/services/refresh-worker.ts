import { parentPort } from 'node:worker_threads';
import { createIngestSqlite } from '../db/client';
import { logger } from '../lib/logger';
import { ingestGtfsArchive } from '../providers/carris-metropolitana/ingest';

interface RefreshWorkerMessage {
  dbPath: string;
  buffer: Uint8Array;
  feedVersion: string;
}

parentPort?.on('message', async (message: RefreshWorkerMessage) => {
  const { dbPath, buffer, feedVersion } = message;
  try {
    // The schema is migrated by the server at boot (`createBackend` →
    // `migrateDb`), so the worker must NOT migrate concurrently: two
    // connections racing migrations left the DB inconsistent ("table already
    // exists") and crash-looped startup with an orphaned WAL. The ingest
    // connection only writes; the final `wal_checkpoint(TRUNCATE)` folds the
    // bulk insert into the main DB file.
    const sqlite = createIngestSqlite(dbPath);
    try {
      await ingestGtfsArchive(sqlite, {
        archive: buffer,
        feedVersion,
        fetchedAt: new Date().toISOString(),
      });
      const [busy] = sqlite.pragma('wal_checkpoint(TRUNCATE)') as Array<{ busy: number }>;
      if (busy) {
        // Readers held the WAL open; the main connection's auto-checkpoint will
        // eventually fold it in. Never leave this silent — a failed truncate is
        // how a multi-GB WAL survives across refreshes.
        logger.warn('wal checkpoint busy', { busy });
      }
    } finally {
      sqlite.close();
    }
    parentPort?.postMessage({ ok: true });
  } catch (err) {
    parentPort?.postMessage({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});
