/**
 * Runtime configuration of the backend API base URL.
 *
 * The SPA resolves where its REST API lives at runtime (not at build time):
 * - `loadApiBaseUrl()` is called once at startup and reads `/config.json`,
 *   which deployments generate from the `API_BASE_URL` environment variable.
 * - The resolved value becomes the default for every data-fetching call;
 *   an explicit `baseUrl` argument always wins over it.
 * - Any failure (unreachable `/config.json`, invalid JSON) falls back to the
 *   empty string, i.e. the same-origin `/api` default, so the Vite dev proxy
 *   and every existing deployment keep working unchanged.
 */

/** Module-level configured base URL; '' means same-origin `/api`. */
let configuredBaseUrl = '';

/**
 * Set the configured API base URL.
 *
 * @param url - base URL of the module backend, or empty/undefined for the
 * same-origin `/api` default. Surrounding whitespace is trimmed.
 */
export function configureApiBaseUrl(url?: string): void {
  configuredBaseUrl = (url ?? '').trim();
}

/**
 * Get the configured API base URL.
 *
 * @returns the configured base URL, or `''` when unset (same-origin `/api`).
 */
export function getApiBaseUrl(): string {
  return configuredBaseUrl;
}

/**
 * Load the API base URL from `/config.json` at runtime.
 *
 * Fetches the runtime config file (parsed as `{ apiBaseUrl?: string }`) and
 * applies it. On any error — network failure, non-OK response, invalid JSON —
 * falls back to the same-origin `/api` default. Never throws.
 */
export async function loadApiBaseUrl(): Promise<void> {
  try {
    const res = await fetch('/config.json', { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      configureApiBaseUrl(undefined);
      return;
    }
    const data = (await res.json()) as { apiBaseUrl?: string };
    configureApiBaseUrl(data.apiBaseUrl);
  } catch {
    configureApiBaseUrl(undefined);
  }
}
