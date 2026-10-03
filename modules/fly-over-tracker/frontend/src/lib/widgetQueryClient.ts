import { QueryClient } from '@tanstack/react-query';

/**
 * Create an isolated query client matching the SPA's config (`retry:false`,
 * `refetchOnWindowFocus:false`) so each embeddable widget is self-sufficient
 * inside any host dashboard and shares no query cache state with other widget
 * instances.
 */
export function createWidgetQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  });
}
