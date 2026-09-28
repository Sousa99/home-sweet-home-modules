import type {
  ConfigStop,
  DepartureThresholds,
  Line,
  Status,
  Stop,
  StopTimesResponse,
  StopWithLines,
} from './types';
import { getApiBaseUrl } from './baseUrl';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly detail?: unknown,
  ) {
    super(code);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit, baseUrl?: string): Promise<T> {
  const base = baseUrl ?? getApiBaseUrl();
  const url = base ? `${base}/api${path}` : `/api${path}`;
  const response = await fetch(url, {
    headers: { 'content-type': 'application/json' },
    ...init,
  });
  if (!response.ok) {
    let error: { error?: string; detail?: unknown } | undefined;
    try {
      error = (await response.json()) as { error?: string; detail?: unknown };
    } catch {
      // non-JSON error body — ignore
    }
    throw new ApiError(response.status, error?.error ?? 'request_failed', error?.detail);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export interface AddConfigStopBody {
  stopId: string;
  lineFilter?: string[];
  displayOrder?: number;
  enabled?: boolean;
  thresholds?: Partial<DepartureThresholds>;
}

export interface UpdateConfigStopBody {
  lineFilter?: string[];
  displayOrder?: number;
  enabled?: boolean;
  thresholds?: Partial<DepartureThresholds>;
}

export const api = {
  searchStops: (q: string, limit = 20, baseUrl?: string) =>
    request<{ stops: Stop[] }>(
      `/stops?q=${encodeURIComponent(q)}&limit=${limit}`,
      undefined,
      baseUrl,
    ),
  getStop: (id: string, baseUrl?: string) =>
    request<{ stop: StopWithLines }>(`/stops/${encodeURIComponent(id)}`, undefined, baseUrl),
  listLines: (baseUrl?: string) => request<{ lines: Line[] }>('/lines', undefined, baseUrl),
  getConfig: (baseUrl?: string) => request<{ stops: ConfigStop[] }>('/config', undefined, baseUrl),
  addConfigStop: (body: AddConfigStopBody, baseUrl?: string) =>
    request<{ stop: ConfigStop }>(
      '/config/stops',
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
      baseUrl,
    ),
  getStopTimes: (stopId: string, limit = 5, lines?: string[], baseUrl?: string) => {
    const params = new URLSearchParams({ limit: String(limit) });
    for (const line of lines ?? []) params.append('line', line);
    return request<StopTimesResponse>(
      `/stops/${encodeURIComponent(stopId)}/times?${params.toString()}`,
      undefined,
      baseUrl,
    );
  },
  getStatus: (baseUrl?: string) => request<Status>('/status', undefined, baseUrl),
  refreshSchedule: (baseUrl?: string) =>
    request<{ status: 'started' | 'in_progress' }>(
      '/refresh',
      {
        method: 'POST',
      },
      baseUrl,
    ),
  updateConfigStop: (id: number, body: UpdateConfigStopBody, baseUrl?: string) =>
    request<{ stop: ConfigStop }>(
      `/config/stops/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(body),
      },
      baseUrl,
    ),
  removeConfigStop: (id: number, baseUrl?: string) =>
    request<void>(`/config/stops/${id}`, { method: 'DELETE' }, baseUrl),
};
