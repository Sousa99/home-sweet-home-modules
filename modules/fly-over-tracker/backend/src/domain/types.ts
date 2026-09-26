import type { z } from 'zod';
import { AircraftSchema, CenterSchema, FlyOverResultSchema, LocationQuerySchema } from './schemas';

/**
 * A validated location query: a GPS point and a radius.
 */
export type LocationQuery = z.infer<typeof LocationQuerySchema>;

/**
 * A single aircraft over the queried area.
 */
export type Aircraft = z.infer<typeof AircraftSchema>;

/**
 * The complete answer to a location query.
 */
export type FlyOverResult = z.infer<typeof FlyOverResultSchema>;

/**
 * The center point of a query, echoed back in a result.
 */
export type Center = z.infer<typeof CenterSchema>;
