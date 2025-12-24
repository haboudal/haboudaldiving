import { createApp } from './app';
import { config } from './config';
import { db } from './config/database';
import { redis } from './config/redis';
import { logger } from './utils/logger';

async function waitForDatabase(maxRetries = 10, delayMs = 3000): Promise<boolean> {
  logger.info('Database config', {
    host: process.env.DB_HOST || 'from DATABASE_URL',
    hasDbUrl: !!process.env.DATABASE_URL,
    dbUrlPrefix: process.env.DATABASE_URL?.substring(0, 30) + '...'
  });

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const healthy = await db.healthCheck();
      if (healthy) return true;
    } catch (error) {
      const err = error as Error;
      logger.warn(`Database connection attempt ${attempt}/${maxRetries} failed`, {
        message: err.message,
        code: (error as NodeJS.ErrnoException).code
      });
    }
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  return false;
}

async function bootstrap(): Promise<void> {
  try {
    // Create and start Express app FIRST so healthcheck works
    const app = createApp();

    // In production, bind to 0.0.0.0 to accept external connections
    const host = config.isProduction ? '0.0.0.0' : config.server.host;

    const server = app.listen(config.server.port, host, () => {
      logger.info(`Server running on http://${host}:${config.server.port}`);
      logger.info(`API available at http://${host}:${config.server.port}/api/${config.server.apiVersion}`);
      logger.info(`Environment: ${config.env}`);
    });

    // Now connect to database in background (don't block startup)
    logger.info('Connecting to database...');
    waitForDatabase().then((dbHealthy) => {
      if (dbHealthy) {
        logger.info('Database connected successfully');
      } else {
        logger.error('Database connection failed after retries - API will have limited functionality');
      }
    });

    // Connect to Redis (optional - don't fail if unavailable)
    redis.connect().then(() => {
      logger.info('Redis connected successfully');
    }).catch((redisError) => {
      logger.warn('Redis connection failed - continuing without cache', { error: redisError });
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string): Promise<void> => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await db.end();
          logger.info('Database connections closed');
        } catch (e) {
          logger.error('Error closing database', { error: e });
        }

        try {
          await redis.disconnect();
          logger.info('Redis connection closed');
        } catch (e) {
          logger.error('Error closing Redis', { error: e });
        }

        logger.info('Graceful shutdown complete');
        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    const err = error as Error;
    logger.error('Failed to start server', {
      message: err.message,
      stack: err.stack,
      name: err.name,
      error: String(error)
    });
    process.exit(1);
  }
}

bootstrap();
