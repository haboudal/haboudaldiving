import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';
import { config } from '../config';
import { ApiResponse } from '../types';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response<ApiResponse>,
  _next: NextFunction
): void => {
  // Log the error
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.userId,
  });

  // Handle known operational errors
  if (err instanceof AppError) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    };

    // Add validation details if present
    if (err instanceof ValidationError && Object.keys(err.errors).length > 0) {
      response.error!.details = err.errors;
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid token',
      },
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Token expired',
      },
    });
    return;
  }

  // Handle PostgreSQL errors
  if ('code' in err) {
    const pgError = err as { code: string; constraint?: string };

    if (pgError.code === '23505') {
      res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_ENTRY',
          message: 'A record with this value already exists',
        },
      });
      return;
    }

    if (pgError.code === '23503') {
      res.status(400).json({
        success: false,
        error: {
          code: 'FOREIGN_KEY_VIOLATION',
          message: 'Referenced record does not exist',
        },
      });
      return;
    }
  }

  // Handle unknown errors
  const statusCode = 500;
  const response: ApiResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: config.isProduction ? 'An unexpected error occurred' : err.message,
    },
  };

  res.status(statusCode).json(response);
};

export const notFoundHandler = (req: Request, res: Response<ApiResponse>): void => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
};
