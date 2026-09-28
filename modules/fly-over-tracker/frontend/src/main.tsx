import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { loadApiBaseUrl } from './api/baseUrl';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Match the app's single-attempt behavior; no silent retry storms.
      retry: false,
      // Refresh only at the selected cadence or on explicit action.
      refetchOnWindowFocus: false,
    },
  },
});

const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('Root element #root not found');
}

// Resolve the runtime API base URL (`/config.json`, generated from the
// `API_BASE_URL` env) before first render so the SPA's default API target is
// correct from the start. The config loader never rejects; any failure falls
// back to the same-origin `/api` default.
void loadApiBaseUrl().finally(() => {
  createRoot(rootElement).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  );
});
