import { z } from 'zod';

export const lineSchema = z.object({
  id: z.string(),
  shortName: z.string(),
  longName: z.string(),
});
export type Line = z.infer<typeof lineSchema>;

export const stopSchema = z.object({
  id: z.string(),
  name: z.string(),
  lat: z.number(),
  lon: z.number(),
  realtimeId: z.string().nullable().optional(),
});
export type Stop = z.infer<typeof stopSchema>;

/**
 * A line option at a stop, resolved per direction so a bidirectional stop
 * yields one entry per direction (e.g. "736 → Cais" and "736 → Outurela").
 */
export const lineOptionSchema = z.object({
  id: z.string(),
  shortName: z.string(),
  longName: z.string(),
  directionId: z.number().nullable(),
  headsign: z.string(),
});
export type LineOption = z.infer<typeof lineOptionSchema>;

export const stopWithLinesSchema = stopSchema.extend({
  lines: z.array(lineOptionSchema),
});
export type StopWithLines = z.infer<typeof stopWithLinesSchema>;

export const passingSchema = z.object({
  tripId: z.string().optional(),
  lineId: z.string(),
  lineShortName: z.string(),
  headsign: z.string(),
  directionId: z.number().nullable().optional(),
  scheduledAt: z.string().datetime(),
  minutesUntil: z.number(),
  source: z.enum(['live', 'scheduled']).optional(),
  predictedAt: z.string().datetime().nullable().optional(),
  delayMinutes: z.number().nullable().optional(),
});
export type Passing = z.infer<typeof passingSchema>;

export const realtimeInfoSchema = z.object({
  available: z.boolean(),
  lastUpdate: z.string().nullable(),
  liveCount: z.number(),
  totalCount: z.number(),
});
export type RealtimeInfo = z.infer<typeof realtimeInfoSchema>;

export const stopTimesResponseSchema = z.object({
  stopId: z.string(),
  times: z.array(passingSchema),
  realtime: realtimeInfoSchema,
});
export type StopTimesResponse = z.infer<typeof stopTimesResponseSchema>;

/** Resolved per-stop departure thresholds (minutes before arrival). */
export const departureThresholdsSchema = z.object({
  headsUpMinutes: z.number().int().min(0),
  leaveNowMinutes: z.number().int().min(0),
  missedMinutes: z.number().int().min(0),
});
export type DepartureThresholds = z.infer<typeof departureThresholdsSchema>;

/**
 * Partial thresholds as accepted on create/update bodies. Each field is
 * optional; ordering (headsUp >= leaveNow >= missed) is enforced by the
 * config service, which falls back to stored values on partial updates.
 */
export const partialThresholdsSchema = z.object({
  headsUpMinutes: z.number().int().min(0).optional(),
  leaveNowMinutes: z.number().int().min(0).optional(),
  missedMinutes: z.number().int().min(0).optional(),
});
export type PartialThresholds = z.infer<typeof partialThresholdsSchema>;

export const configStopSchema = z.object({
  id: z.number(),
  stop: stopSchema,
  lineFilter: z.array(z.string()),
  displayOrder: z.number(),
  enabled: z.boolean(),
  thresholds: departureThresholdsSchema,
  missing: z.boolean().optional(),
});
export type ConfigStop = z.infer<typeof configStopSchema>;

export const statusSchema = z.object({
  lastRefresh: z.string().nullable(),
  feedVersion: z.string().nullable(),
  stale: z.boolean(),
  refreshing: z.boolean(),
  realtimeLastUpdate: z.string().nullable().optional(),
  realtimeAvailable: z.boolean().optional(),
  realtimeStale: z.boolean().optional(),
});
export type Status = z.infer<typeof statusSchema>;

export const searchStopsQuerySchema = z.object({
  q: z.string().min(2),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type SearchStopsQuery = z.infer<typeof searchStopsQuerySchema>;

export const nextTimesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(5),
  line: z.array(z.string()).optional(),
});
export type NextTimesQuery = z.infer<typeof nextTimesQuerySchema>;

export const createConfigStopBodySchema = z.object({
  stopId: z.string().min(1),
  lineFilter: z.array(z.string()).optional(),
  displayOrder: z.number().int().optional(),
  enabled: z.boolean().optional(),
  thresholds: partialThresholdsSchema.optional(),
});
export type CreateConfigStopBody = z.infer<typeof createConfigStopBodySchema>;

export const updateConfigStopBodySchema = z.object({
  lineFilter: z.array(z.string()).optional(),
  displayOrder: z.number().int().optional(),
  enabled: z.boolean().optional(),
  thresholds: partialThresholdsSchema.optional(),
});
export type UpdateConfigStopBody = z.infer<typeof updateConfigStopBodySchema>;
