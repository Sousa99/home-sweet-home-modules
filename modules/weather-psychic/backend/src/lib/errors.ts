import type { ZodError } from 'zod';

/**
 * Error codes shared by the REST and MCP interfaces.
 *
 * `validation_error` maps to HTTP 400, `provider_unavailable` to 502 (upstream
 * provider failure).
 */
export type ErrorCode = 'validation_error' | 'provider_unavailable' | 'internal_error';

export interface AppErrorOptions {
  /** Machine-readable error code. */
  code: ErrorCode;
  /** HTTP status code associated with the error. */
  status: number;
  /** Underlying error, if any. */
  cause?: unknown;
  /** Extra structured detail (e.g. per-field validation errors). */
  details?: unknown;
}

/**
 * Base application error. Every error that should be surfaced to REST and MCP
 * consumers derives from this class so the shared error mapper can translate
 * it consistently.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, options: AppErrorOptions) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'AppError';
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
  }
}

/**
 * Raised when a request does not satisfy the input contract (invalid or
 * out-of-range query parameters). Maps to HTTP 400.
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, { code: 'validation_error', status: 400, details });
    this.name = 'ValidationError';
  }
}

/**
 * Raised when the upstream weather provider cannot provide data (unreachable,
 * errored, or timed out). Maps to HTTP 502.
 */
export class ProviderUnavailableError extends AppError {
  constructor(message: string, options: { cause?: unknown } = {}) {
    super(message, { code: 'provider_unavailable', status: 502, cause: options.cause });
    this.name = 'ProviderUnavailableError';
  }
}

/** A field-level validation error entry returned to the caller. */
export interface FieldError {
  field: string;
  message: string;
}

/** Standard error payload shared by the REST and MCP interfaces. */
export interface ErrorResponse {
  success: false;
  message: string;
  errors?: FieldError[];
}

/**
 * The HTTP status that should be used for an arbitrary thrown value.
 * Unknown errors are treated as internal (500).
 */
export function errorStatus(err: unknown): number {
  return err instanceof AppError ? err.status : 500;
}

/**
 * Translate any thrown value into the shared {@link ErrorResponse} shape.
 * Unknown errors are masked with a generic message so internals are not leaked.
 */
export function toErrorResponse(err: unknown): ErrorResponse {
  if (err instanceof ValidationError) {
    const errors = Array.isArray(err.details) ? (err.details as FieldError[]) : undefined;
    return { success: false, message: err.message, errors };
  }
  if (err instanceof AppError) {
    return { success: false, message: err.message };
  }
  return { success: false, message: 'Unexpected internal error' };
}

/**
 * Flatten a zod validation error into a list of {@link FieldError} entries
 * suitable for the shared {@link ErrorResponse} shape.
 */
export function formatZodError(error: Pick<ZodError<never>, 'issues'>): FieldError[] {
  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : 'value',
    message: issue.message,
  }));
}
