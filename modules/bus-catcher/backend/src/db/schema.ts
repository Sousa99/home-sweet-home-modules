import { sqliteTable, text, integer, real, index, primaryKey } from 'drizzle-orm/sqlite-core';

export const lines = sqliteTable('lines', {
  id: text('id').primaryKey(),
  shortName: text('short_name').notNull(),
  longName: text('long_name').notNull(),
  routeType: integer('route_type').notNull(),
  agencyId: text('agency_id'),
});

export const stops = sqliteTable('stops', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  lat: real('lat'),
  lon: real('lon'),
  // The id the realtime feed knows this stop by (from GTFS legacy_ids).
  // Differs from `id` when the static feed renumbers stops.
  realtimeId: text('realtime_id'),
});

export const trips = sqliteTable(
  'trips',
  {
    id: text('id').primaryKey(),
    lineId: text('line_id')
      .notNull()
      .references(() => lines.id),
    serviceId: text('service_id').notNull(),
    headsign: text('headsign').notNull(),
    directionId: integer('direction_id'),
  },
  (t) => [index('trips_service_idx').on(t.serviceId)],
);

export const stopTimes = sqliteTable(
  'stop_times',
  {
    tripId: text('trip_id')
      .notNull()
      .references(() => trips.id),
    stopSequence: integer('stop_sequence').notNull(),
    stopId: text('stop_id')
      .notNull()
      .references(() => stops.id),
    arrivalMin: integer('arrival_min').notNull(),
    departureMin: integer('departure_min').notNull(),
    pickupType: integer('pickup_type'),
    dropOffType: integer('drop_off_type'),
  },
  (t) => [
    primaryKey({ columns: [t.tripId, t.stopSequence] }),
    index('stop_times_stop_arrival_idx').on(t.stopId, t.arrivalMin),
    index('stop_times_trip_idx').on(t.tripId),
  ],
);

export const calendar = sqliteTable('calendar', {
  serviceId: text('service_id').primaryKey(),
  monday: integer('monday').notNull(),
  tuesday: integer('tuesday').notNull(),
  wednesday: integer('wednesday').notNull(),
  thursday: integer('thursday').notNull(),
  friday: integer('friday').notNull(),
  saturday: integer('saturday').notNull(),
  sunday: integer('sunday').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
});

export const calendarDates = sqliteTable(
  'calendar_dates',
  {
    serviceId: text('service_id').notNull(),
    date: text('date').notNull(),
    exceptionType: integer('exception_type').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.serviceId, t.date] }),
    index('calendar_dates_date_idx').on(t.date),
  ],
);

export const configuredStops = sqliteTable('configured_stops', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  stopId: text('stop_id')
    .notNull()
    .references(() => stops.id),
  lineFilter: text('line_filter'),
  displayOrder: integer('display_order').notNull().default(0),
  enabled: integer('enabled').notNull().default(1),
});

export const metadata = sqliteTable('metadata', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
