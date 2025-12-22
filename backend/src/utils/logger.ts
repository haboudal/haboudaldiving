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

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  format: isDev
    ? combine(colorize({ all: true }), timestamp({ format: 'HH:mm:ss' }), errors({ stack: true }), logFormat)
    : combine(timestamp(), errors({ stack: true }), winston.format.json()),
  transports: [new winston.transports.Console()],
});

export const httpLogStream = {
  write: (message: string): void => {
    logger.http(message.trim());
  },
};
