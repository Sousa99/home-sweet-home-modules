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
});
export type Stop = z.infer<typeof stopSchema>;

export const stopWithLinesSchema = stopSchema.extend({
  lines: z.array(lineSchema),
});
export type StopWithLines = z.infer<typeof stopWithLinesSchema>;

export const passingSchema = z.object({
  lineId: z.string(),
  lineShortName: z.string(),
  headsign: z.string(),
  scheduledAt: z.string().datetime(),
  minutesUntil: z.number(),
});
export type Passing = z.infer<typeof passingSchema>;

export const configStopSchema = z.object({
  id: z.number(),
  stop: stopSchema,
  lineFilter: z.array(z.string()),
  displayOrder: z.number(),
  enabled: z.boolean(),
  missing: z.boolean().optional(),
});
export type ConfigStop = z.infer<typeof configStopSchema>;

export const statusSchema = z.object({
  lastRefresh: z.string().nullable(),
  feedVersion: z.string().nullable(),
  stale: z.boolean(),
  refreshing: z.boolean(),
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
});
export type CreateConfigStopBody = z.infer<typeof createConfigStopBodySchema>;

export const updateConfigStopBodySchema = z.object({
  lineFilter: z.array(z.string()).optional(),
  displayOrder: z.number().int().optional(),
  enabled: z.boolean().optional(),
});
export type UpdateConfigStopBody = z.infer<typeof updateConfigStopBodySchema>;
