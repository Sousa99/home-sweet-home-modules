import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '../db/schema';
import { createCarrisMetropolitanaProvider } from '../providers/carris-metropolitana';
import type { ScheduleProvider } from '../providers/types';
import { createConfigService, type ConfigService } from '../services/config';

export type TestDb = {
  sqlite: Database.Database;
  db: BetterSQLite3Database<typeof schema>;
};

export interface TestBackend {
  sqlite: Database.Database;
  db: TestDb['db'];
  provider: ScheduleProvider;
  config: ConfigService;
}

export function createTestDb(): TestDb {
  return createTestDbAt(':memory:');
}

export function createTestDbAt(dbPath: string): TestDb {
  const sqlite = new Database(dbPath);
  const db = drizzle(sqlite, { schema });
  const migrationsFolder = new URL('../../drizzle', import.meta.url).pathname;
  migrate(db, { migrationsFolder });
  return { sqlite, db };
}

export function createTestBackend(): TestBackend {
  const { sqlite, db } = createTestDb();
  return {
    sqlite,
    db,
    provider: createCarrisMetropolitanaProvider(db),
    config: createConfigService(db),
  };
}

export function seedTestFeed({ db }: TestDb): void {
  db.insert(schema.lines)
    .values([
      {
        id: 'L1',
        shortName: '736',
        longName: 'Cais do Sodré — Outurela',
        routeType: 3,
        agencyId: 'A1',
      },
      {
        id: 'L2',
        shortName: '706',
        longName: 'Cais do Sodré — Cemitério da Ajuda',
        routeType: 3,
        agencyId: 'A1',
      },
    ])
    .run();
  db.insert(schema.stops)
    .values([
      { id: 'S1', name: 'Av. Teste', lat: 38.7, lon: -9.1 },
      { id: 'S2', name: 'Rua Teste', lat: 38.72, lon: -9.12 },
    ])
    .run();
  db.insert(schema.calendar)
    .values([
      {
        serviceId: 'WD',
        monday: 1,
        tuesday: 1,
        wednesday: 1,
        thursday: 1,
        friday: 1,
        saturday: 0,
        sunday: 0,
        startDate: '20260101',
        endDate: '20261231',
      },
      {
        serviceId: 'WE',
        monday: 0,
        tuesday: 0,
        wednesday: 0,
        thursday: 0,
        friday: 0,
        saturday: 1,
        sunday: 1,
        startDate: '20260101',
        endDate: '20261231',
      },
    ])
    .run();
  db.insert(schema.calendarDates)
    .values([{ serviceId: 'WD', date: '20260617', exceptionType: 2 }])
    .run();
  db.insert(schema.trips)
    .values([
      { id: 'T1', lineId: 'L1', serviceId: 'WD', headsign: 'Cais', directionId: 0 },
      { id: 'T2', lineId: 'L1', serviceId: 'WD', headsign: 'Cais', directionId: 0 },
      { id: 'T3', lineId: 'L2', serviceId: 'WE', headsign: 'Campo de Ourique', directionId: 0 },
      { id: 'T4', lineId: 'L1', serviceId: 'WD', headsign: 'Cais', directionId: 0 },
    ])
    .run();
  db.insert(schema.stopTimes)
    .values([
      {
        tripId: 'T1',
        stopSequence: 1,
        stopId: 'S1',
        arrivalMin: 600,
        departureMin: 600,
        pickupType: 0,
        dropOffType: 0,
      },
      {
        tripId: 'T1',
        stopSequence: 2,
        stopId: 'S2',
        arrivalMin: 615,
        departureMin: 615,
        pickupType: 0,
        dropOffType: 0,
      },
      {
        tripId: 'T2',
        stopSequence: 1,
        stopId: 'S1',
        arrivalMin: 700,
        departureMin: 700,
        pickupType: 0,
        dropOffType: 0,
      },
      {
        tripId: 'T3',
        stopSequence: 1,
        stopId: 'S1',
        arrivalMin: 720,
        departureMin: 720,
        pickupType: 0,
        dropOffType: 0,
      },
      {
        tripId: 'T4',
        stopSequence: 1,
        stopId: 'S1',
        arrivalMin: 1500,
        departureMin: 1500,
        pickupType: 0,
        dropOffType: 0,
      },
    ])
    .run();
}
