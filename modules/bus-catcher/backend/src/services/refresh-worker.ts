import { parentPort } from 'node:worker_threads';
import { createIngestSqlite } from '../db/client';
import { unzipGtfs } from '../providers/carris-metropolitana/gtfs';
import { ingestGtfsZip } from '../providers/carris-metropolitana/ingest';

interface RefreshWorkerMessage {
  dbPath: string;
  buffer: Uint8Array;
  feedVersion: string;
}

parentPort?.on('message', async (message: RefreshWorkerMessage) => {
  const { dbPath, buffer, feedVersion } = message;
  try {
    const zip = unzipGtfs(buffer);
    // The schema is migrated by the server at boot (`createBackend` →
    // `migrateDb`), so the worker must NOT migrate concurrently: two
    // connections racing migrations left the DB inconsistent ("table already
    // exists") and crash-looped startup with an orphaned WAL. The ingest
    // connection only writes; the final `wal_checkpoint(TRUNCATE)` folds the
    // bulk insert into the main DB file.
    const sqlite = createIngestSqlite(dbPath);
    try {
      await ingestGtfsZip(sqlite, {
        zip,
        feedVersion,
        fetchedAt: new Date().toISOString(),
      });
      sqlite.pragma('wal_checkpoint(TRUNCATE)');
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
