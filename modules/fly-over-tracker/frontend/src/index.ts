/**
 * fly-over-tracker dashboard widgets library entry.
 *
 * Publishes the embeddable widgets for a dashboard:
 * - `FlyOverWidget` — map + aircraft list combined (single component);
 * - `FlyOverMapCard` — map only (place independently of the list);
 * - `FlyOverListCard` — aircraft list only, with an optional `maxResults` cap;
 * - `ClosestAircraftCard` — nearest aircraft.
 * Together with the types their public props reference. The SPA components, the
 * UI primitives, and the backend API client are internal implementation details
 * and are not part of the published surface.
 */
export { ClosestAircraftCard, FlyOverWidget, FlyOverMapCard, FlyOverListCard } from './components';
export type {
  ClosestAircraftCardProps,
  FlyOverWidgetProps,
  FlyOverMapCardProps,
  FlyOverListCardProps,
  RefreshRate,
} from './components';
export type { Aircraft, Center, FlyOverResult, LocationQuery } from './api/types';
