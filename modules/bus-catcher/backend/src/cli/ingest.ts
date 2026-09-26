import { createHash } from 'node:crypto';
import { config } from '../config';
import { createIngestSqlite } from '../db/client';
import { migrateDb } from '../db/migrate';
import { logger } from '../lib/logger';
import { downloadGtfs, unzipGtfs } from '../providers/carris-metropolitana/gtfs';
import { ingestGtfsZip } from '../providers/carris-metropolitana/ingest';

async function main(): Promise<void> {
  logger.info('downloading GTFS feed', { url: config.feedUrl });
  const buffer = await downloadGtfs(config.feedUrl);
  const feedVersion = createHash('sha256').update(buffer).digest('hex').slice(0, 12);
  logger.info('feed downloaded', { bytes: buffer.byteLength, feedVersion });

  const zip = unzipGtfs(buffer);

  migrateDb();
  const sqlite = createIngestSqlite();
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
}

main().catch((err: unknown) => {
  logger.error('ingest failed', {
    message: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
