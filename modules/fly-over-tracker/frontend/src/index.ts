/**
 * fly-over-tracker dashboard widgets library entry.
 *
 * Publishes the two self-sufficient embeddable widgets for a dashboard —
 * `FlyOverWidget` (map + aircraft list) and `ClosestAircraftCard` (nearest
 * aircraft) — together with the types their public props reference. The SPA
 * components, the UI primitives, and the backend API client are internal
 * implementation details and are not part of the published surface.
 */
export { ClosestAircraftCard, FlyOverWidget } from './components';
export type { ClosestAircraftCardProps, FlyOverWidgetProps, RefreshRate } from './components';
export type { Aircraft, Center, FlyOverResult, LocationQuery } from './api/types';
