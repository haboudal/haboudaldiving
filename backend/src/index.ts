import { createApp } from './app';
import { config } from './config';
import { db } from './config/database';
import { redis } from './config/redis';
import { logger } from './utils/logger';

async function bootstrap(): Promise<void> {
  try {
    // Test database connection
    const dbHealthy = await db.healthCheck();
    if (!dbHealthy) {
      throw new Error('Database connection failed');
    }
    logger.info('Database connected successfully');

    // Connect to Redis
    try {
      await redis.connect();
      logger.info('Redis connected successfully');
    } catch (redisError) {
      logger.warn('Redis connection failed - continuing without cache', { error: redisError });
    }

    // Create and start Express app
    const app = createApp();

    const server = app.listen(config.server.port, config.server.host, () => {
      logger.info(`Server running on http://${config.server.host}:${config.server.port}`);
      logger.info(`API available at http://${config.server.host}:${config.server.port}/api/${config.server.apiVersion}`);
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
