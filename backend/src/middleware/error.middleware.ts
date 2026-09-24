import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  console.error('Unhandled Server Error:', err);

  const status = err.status || 500;
  const message = err.message || 'An unexpected internal healthcare system error occurred.';

  res.status(status).json({
    success: false,
    error: message,
  });
}
