let configuredBaseUrl = '';

/**
 * Sets the module-wide API base URL (runtime-configured, not baked at build
 * time). An empty/undefined value means requests target the same-origin `/api`
 * path. See docs/module-standard.md §2.
 */
export function configureApiBaseUrl(url?: string): void {
  configuredBaseUrl = (url ?? '').trim();
}

/**
 * Returns the configured API base URL; `''` (empty) means same-origin `/api`.
 */
export function getApiBaseUrl(): string {
  return configuredBaseUrl;
}

/**
 * Loads the API base URL from the SPA runtime `/config.json` file. On any
 * failure it resets to the same-origin fallback. Never throws.
 */
export async function loadApiBaseUrl(): Promise<void> {
  try {
    const res = await fetch('/config.json', { headers: { Accept: 'application/json' } });
    const data = (await res.json()) as { apiBaseUrl?: string };
    configureApiBaseUrl(data.apiBaseUrl);
  } catch {
    configureApiBaseUrl(undefined);
  }
}
