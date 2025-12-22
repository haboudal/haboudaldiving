import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';

// Controllers
import { devicesController } from './devices/devices.controller';
import { notificationsController } from './notifications/notifications.controller';
import { preferencesController } from './preferences/preferences.controller';
import { syncController } from './sync/sync.controller';

// Validation schemas
import {
  uuidParamSchema,
  entityTypeParamSchema,
  registerDeviceSchema,
  updateDeviceSchema,
  notificationFiltersSchema,
  updatePreferencesSchema,
  submitSyncSchema,
  confirmSyncSchema,
  deltaSyncQuerySchema,
  syncStatusQuerySchema,
} from './mobile.validation';

const router = Router();

// All mobile routes require authentication
router.use(authenticate);

// ============================================================================
// DEVICE ROUTES
// ============================================================================

router.post(
  '/devices',
  validate(registerDeviceSchema),
  devicesController.register
);

router.get('/devices', devicesController.list);

router.get(
  '/devices/:id',
  validate(uuidParamSchema, 'params'),
  devicesController.getById
);

router.patch(
  '/devices/:id',
  validate(uuidParamSchema, 'params'),
  validate(updateDeviceSchema),
  devicesController.update
);

router.delete(
  '/devices/:id',
  validate(uuidParamSchema, 'params'),
  devicesController.deactivate
);

// ============================================================================
// NOTIFICATION ROUTES
// ============================================================================

router.get(
  '/notifications',
  validate(notificationFiltersSchema, 'query'),
  notificationsController.list
);

router.get('/notifications/unread-count', notificationsController.getUnreadCount);

router.patch(
  '/notifications/:id/read',
  validate(uuidParamSchema, 'params'),
  notificationsController.markAsRead
);

router.post('/notifications/mark-all-read', notificationsController.markAllAsRead);

router.delete(
  '/notifications/:id',
  validate(uuidParamSchema, 'params'),
  notificationsController.delete
);

// ============================================================================
// PREFERENCES ROUTES
// ============================================================================

router.get('/preferences', preferencesController.get);

router.patch(
  '/preferences',
  validate(updatePreferencesSchema),
  preferencesController.update
);

router.post('/preferences/reset', preferencesController.reset);

// ============================================================================
// SYNC ROUTES
// ============================================================================

router.post(
  '/sync/queue',
  validate(submitSyncSchema),
  syncController.submitChanges
);

router.get(
  '/sync/status',
  validate(syncStatusQuerySchema, 'query'),
  syncController.getStatus
);

router.post(
  '/sync/confirm',
  validate(confirmSyncSchema),
  syncController.confirmSync
);

router.get(
  '/sync/delta/:entityType',
  validate(entityTypeParamSchema, 'params'),
  validate(deltaSyncQuerySchema, 'query'),
  syncController.getDeltaSync
);

router.get(
  '/sync/init/:entityType',
  validate(entityTypeParamSchema, 'params'),
  syncController.getInitialSync
);

export default router;
