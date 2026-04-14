import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { config } from '../config';
import { logger } from '../utils/logger';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, code?: string): AppError {
    return new AppError(message, 400, true, code);
  }

  static unauthorized(message: string = 'Unauthorized'): AppError {
    return new AppError(message, 401, true, 'UNAUTHORIZED');
  }

  static forbidden(message: string = 'Forbidden'): AppError {
    return new AppError(message, 403, true, 'FORBIDDEN');
  }

  static notFound(resource: string = 'Resource'): AppError {
    return new AppError(`${resource} not found`, 404, true, 'NOT_FOUND');
  }

  static conflict(message: string): AppError {
    return new AppError(message, 409, true, 'CONFLICT');
  }

  static tooManyRequests(message: string = 'Too many requests'): AppError {
    return new AppError(message, 429, true, 'TOO_MANY_REQUESTS');
  }

  static internal(message: string = 'Internal server error'): AppError {
    return new AppError(message, 500, false, 'INTERNAL_ERROR');
  }
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log the error
  logger.error('Error:', err.message, err.stack);

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation error',
      code: 'VALIDATION_ERROR',
      details: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Handle AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      ...(config.isDev && { stack: err.stack }),
    });
    return;
  }

  // Handle unknown errors
  res.status(500).json({
    error: config.isProd ? 'Internal server error' : err.message,
    code: 'INTERNAL_ERROR',
    ...(config.isDev && { stack: err.stack }),
  });
};
