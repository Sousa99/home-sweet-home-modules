import { loadConfig } from '../lib/config';
import { FeedUnavailableError } from '../lib/errors';

export interface OAuth2TokenManagerOptions {
  /** OpenSky OAuth2 client id (defaults to config). */
  clientId?: string;
  /** OpenSky OAuth2 client secret (defaults to config). */
  clientSecret?: string;
  /** OpenSky token endpoint URL (defaults to config). */
  tokenUrl?: string;
  /** fetch implementation override (for tests). */
  fetchImpl?: typeof fetch;
  /** Clock for expiry checks (for tests; default `Date.now`). */
  now?: () => number;
  /** Proactive-refresh margin in ms before expiry (default 60_000). */
  refreshMarginMs?: number;
}

interface TokenCacheEntry {
  accessToken: string;
  expiresAtMs: number;
}

/**
 * OpenSky OAuth2 client-credentials token manager.
 *
 * Exchanges `client_id`/`client_secret` for a Bearer access token at the
 * OpenSky token endpoint, caches it with a proactive-refresh margin, and
 * force-refreshes on demand (e.g. after a 401). OpenSky tokens expire after
 * 30 minutes; `hasCredentials` is `false` when running on the anonymous tier.
 */
export class OAuth2TokenManager {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly tokenUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;
  private readonly refreshMarginMs: number;
  private cached: TokenCacheEntry | null = null;

  constructor(options: OAuth2TokenManagerOptions = {}) {
    const cfg = loadConfig();
    this.clientId = options.clientId ?? cfg.openskyClientId;
    this.clientSecret = options.clientSecret ?? cfg.openskyClientSecret;
    this.tokenUrl = options.tokenUrl ?? cfg.openskyTokenUrl;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? Date.now;
    this.refreshMarginMs = options.refreshMarginMs ?? 60_000;
  }

  /** Whether the manager holds valid client credentials (else anonymous tier). */
  get hasCredentials(): boolean {
    return this.clientId !== '' && this.clientSecret !== '';
  }

  /**
   * Return a valid Bearer access token, obtaining or refreshing it as needed.
   *
   * @returns the access token
   * @throws {FeedUnavailableError} when the token cannot be obtained
   */
  async getToken(): Promise<string> {
    if (this.cached !== null && this.cached.expiresAtMs - this.refreshMarginMs > this.now()) {
      return this.cached.accessToken;
    }
    return this.refresh();
  }

  /**
   * Force-obtain a fresh token (used after a 401).
   *
   * @returns the new access token
   * @throws {FeedUnavailableError} when the token cannot be obtained
   */
  async refresh(): Promise<string> {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    let response: Response;
    try {
      response = await this.fetchImpl(this.tokenUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body,
      });
    } catch (err) {
      throw new FeedUnavailableError('OpenSky token request failed', {
        retryable: true,
        cause: err,
      });
    }

    if (!response.ok) {
      throw new FeedUnavailableError(`OpenSky token request returned HTTP ${response.status}`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch (err) {
      throw new FeedUnavailableError('OpenSky token response is unreadable', { cause: err });
    }

    const record = data as Record<string, unknown>;
    const accessToken = record['access_token'];
    const expiresInSeconds = Number(record['expires_in'] ?? 1800);
    if (typeof accessToken !== 'string' || accessToken === '') {
      throw new FeedUnavailableError('OpenSky token response is missing access_token');
    }

    this.cached = {
      accessToken,
      expiresAtMs: this.now() + expiresInSeconds * 1000,
    };
    return accessToken;
  }
}
