import { createApp } from './app';
import { config } from './config';
import { db } from './config/database';
import { redis } from './config/redis';
import { logger } from './utils/logger';

async function waitForDatabase(maxRetries = 10, delayMs = 3000): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const healthy = await db.healthCheck();
      if (healthy) return true;
    } catch (error) {
      logger.warn(`Database connection attempt ${attempt}/${maxRetries} failed`, { error });
    }
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  return false;
}

async function bootstrap(): Promise<void> {
  try {
    // Wait for database connection with retries
    logger.info('Waiting for database connection...');
    const dbHealthy = await waitForDatabase();
    if (!dbHealthy) {
      throw new Error('Database connection failed after retries');
    }
    logger.info('Database connected successfully');

    // Connect to Redis (optional - don't fail if unavailable)
    try {
      await redis.connect();
      logger.info('Redis connected successfully');
    } catch (redisError) {
      logger.warn('Redis connection failed - continuing without cache', { error: redisError });
    }

    // Create and start Express app
    const app = createApp();

    // In production, bind to 0.0.0.0 to accept external connections
    const host = config.isProduction ? '0.0.0.0' : config.server.host;

    const server = app.listen(config.server.port, host, () => {
      logger.info(`Server running on http://${host}:${config.server.port}`);
      logger.info(`API available at http://${host}:${config.server.port}/api/${config.server.apiVersion}`);
      logger.info(`Environment: ${config.env}`);
      logger.info(`SRSA Mock Mode: ${config.srsa.useMock ? 'enabled' : 'disabled'}`);
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
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

bootstrap();
