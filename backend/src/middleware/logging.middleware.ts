import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  // Generate request ID
  req.requestId = req.headers['x-request-id'] as string || uuidv4();
  req.startTime = Date.now();

  // Add request ID to response headers
  res.setHeader('X-Request-ID', req.requestId);

  // Log request
  logger.info('Incoming request', {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Log response on finish
  res.on('finish', () => {
    const duration = Date.now() - (req.startTime || Date.now());
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

    logger[logLevel]('Request completed', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.userId,
    });
  });

  next();
};

export const sensitiveDataFilter = (req: Request, _res: Response, next: NextFunction): void => {
  // Mask sensitive data in logs
  if (req.body) {
    const sensitiveFields = ['password', 'passwordConfirm', 'token', 'refreshToken', 'nationalId', 'iqamaNumber'];

    for (const field of sensitiveFields) {
      if (req.body[field]) {
        req.body[`_masked_${field}`] = '[REDACTED]';
      }
    }
  }

  next();
};
