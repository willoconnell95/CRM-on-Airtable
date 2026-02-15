import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Error:', err.message);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // Airtable errors
  if ((err as any).statusCode) {
    const statusCode = (err as any).statusCode;
    const message =
      statusCode === 422
        ? 'Invalid data: check field names and types'
        : statusCode === 429
          ? 'Rate limit exceeded, please retry shortly'
          : statusCode === 404
            ? 'Record not found'
            : err.message;
    res.status(statusCode).json({ error: message });
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
}
