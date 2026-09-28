let configuredBaseUrl = '';

/**
 * Set the base URL the SPA's API client targets. An empty value restores the
 * same-origin `/api` default. Surrounding whitespace is trimmed.
 */
export function configureApiBaseUrl(url?: string): void {
  configuredBaseUrl = (url ?? '').trim();
}

/** The currently configured API base URL; '' means same-origin `/api`. */
export function getApiBaseUrl(): string {
  return configuredBaseUrl;
}

/**
 * Load the runtime API base URL from `/config.json` (`{ apiBaseUrl?: string }`).
 * On any failure the SPA falls back to the same-origin `/api` default. Never
 * throws.
 */
export async function loadApiBaseUrl(): Promise<void> {
  try {
    const response = await fetch('/config.json', {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      configureApiBaseUrl(undefined);
      return;
    }
    const data = (await response.json()) as { apiBaseUrl?: string };
    configureApiBaseUrl(data.apiBaseUrl);
  } catch {
    configureApiBaseUrl(undefined);
  }
}
