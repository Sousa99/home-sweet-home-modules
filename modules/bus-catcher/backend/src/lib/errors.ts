export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message?: string,
    public readonly detail?: unknown,
  ) {
    super(message ?? code);
    this.name = 'AppError';
  }
}
