import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';

import { config } from './config';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { requestLogger } from './middleware/logging.middleware';
import { swaggerSpec } from './docs/swagger';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import diversRoutes from './modules/divers/divers.routes';
import instructorsRoutes from './modules/instructors/instructors.routes';
import guardiansRoutes from './modules/guardians/guardians.routes';
import centersRoutes from './modules/centers/centers.routes';
import quotaRoutes from './integrations/srsa/quota.routes';
import tripsRoutes from './modules/trips/trips.routes';
import paymentsRoutes from './modules/payments/payments.routes';
import adminRoutes from './modules/admin/admin.routes';
import mobileRoutes from './modules/mobile/mobile.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import reviewsRoutes from './modules/reviews/reviews.routes';
import diveLogsRoutes from './modules/dive-logs/dive-logs.routes';

export function createApp(): Express {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: config.cors.allowedOrigins,
    credentials: true,
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: {
      success: false,
      error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests, please try again later' },
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(compression());

  // Logging
  app.use(requestLogger);

  // Health check
  app.get('/health', (_req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    });
  });

  // API Documentation
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Diving Platform API Documentation',
  }));

  // OpenAPI JSON endpoint
  app.get('/api/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // API routes - v1
  const apiV1 = express.Router();

  apiV1.use('/auth', authRoutes);
  apiV1.use('/users', usersRoutes);
  apiV1.use('/divers', diversRoutes);
  apiV1.use('/instructors', instructorsRoutes);
  apiV1.use('/guardians', guardiansRoutes);
  apiV1.use('/centers', centersRoutes);
  apiV1.use('/quota', quotaRoutes);
  apiV1.use('/trips', tripsRoutes);
  apiV1.use('/payments', paymentsRoutes);
  apiV1.use('/admin', adminRoutes);
  apiV1.use('/mobile', mobileRoutes);
  apiV1.use('/analytics', analyticsRoutes);
  apiV1.use('/notifications', notificationsRoutes);
  apiV1.use('/reviews', reviewsRoutes);
  apiV1.use('/dive-logs', diveLogsRoutes);

  app.use(`/api/${config.server.apiVersion}`, apiV1);

  // 404 handler
  app.use(notFoundHandler);

  // Error handling
  app.use(errorHandler);

  return app;
}
