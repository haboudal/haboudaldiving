import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, ...meta }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  const { stack, ...rest } = meta;
  if (Object.keys(rest).length > 0) {
    msg += ` ${JSON.stringify(rest)}`;
  }
  if (stack) msg += `\n${stack}`;
  return msg;
});

const isDev = process.env.NODE_ENV !== 'production';

// Add service name for production log aggregation
const defaultMeta = isDev ? {} : { service: 'diving-platform-api' };

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  defaultMeta,
  format: isDev
    ? combine(colorize({ all: true }), timestamp({ format: 'HH:mm:ss' }), errors({ stack: true }), logFormat)
    : combine(timestamp(), errors({ stack: true }), winston.format.json()),
  transports: [new winston.transports.Console()],
  // Don't exit on handled exceptions in production
  exitOnError: false,
});

export const httpLogStream = {
  write: (message: string): void => {
    logger.http(message.trim());
  },
};

// Child logger with request context
export const createRequestLogger = (requestId: string, userId?: string) => {
  return logger.child({ requestId, userId });
};
