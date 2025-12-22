import { z } from 'zod';

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

export const entityTypeParamSchema = z.object({
  entityType: z.enum(['dive_logs', 'certifications', 'bookings', 'favorites']),
});

// ============================================================================
// DEVICE SCHEMAS
// ============================================================================

export const registerDeviceSchema = z.object({
  deviceIdentifier: z.string().min(1).max(255),
  deviceType: z.enum(['ios', 'android', 'web']),
  deviceName: z.string().max(100).optional(),
  osVersion: z.string().max(50).optional(),
  appVersion: z.string().max(50).optional(),
  model: z.string().max(100).optional(),
  pushToken: z.string().max(500).optional(),
  pushTokenType: z.enum(['fcm', 'apn', 'web_push']).optional(),
}).refine(
  (data) => !data.pushToken || data.pushTokenType,
  { message: 'pushTokenType is required when pushToken is provided', path: ['pushTokenType'] }
);

export const updateDeviceSchema = z.object({
  deviceName: z.string().max(100).optional(),
  osVersion: z.string().max(50).optional(),
  appVersion: z.string().max(50).optional(),
  pushToken: z.string().max(500).optional(),
  pushTokenType: z.enum(['fcm', 'apn', 'web_push']).optional(),
  pushEnabled: z.boolean().optional(),
});

// ============================================================================
// NOTIFICATION SCHEMAS
// ============================================================================

export const notificationFiltersSchema = z.object({
  type: z.string().max(50).optional(),
  read: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ============================================================================
// PREFERENCES SCHEMAS
// ============================================================================

const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

export const updatePreferencesSchema = z.object({
  pushEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  notificationTypes: z.object({
    booking_confirmed: z.boolean().optional(),
    trip_reminder: z.boolean().optional(),
    payment_received: z.boolean().optional(),
    new_message: z.boolean().optional(),
    review_response: z.boolean().optional(),
  }).optional(),
  quietHoursStart: z.string().regex(timeRegex, 'Invalid time format (HH:MM)').nullable().optional(),
  quietHoursEnd: z.string().regex(timeRegex, 'Invalid time format (HH:MM)').nullable().optional(),
  timezone: z.string().max(50).optional(),
}).refine(
  (data) => {
    // If one quiet hours field is set, both must be set or both null
    if (data.quietHoursStart !== undefined || data.quietHoursEnd !== undefined) {
      const start = data.quietHoursStart;
      const end = data.quietHoursEnd;
      return (start === null && end === null) || (start !== null && end !== null);
    }
    return true;
  },
  { message: 'Both quietHoursStart and quietHoursEnd must be provided together or both set to null', path: ['quietHoursStart'] }
);

// ============================================================================
// SYNC SCHEMAS
// ============================================================================

const syncItemSchema = z.object({
  clientId: z.string().min(1).max(100),
  action: z.enum(['create', 'update', 'delete']),
  entityType: z.enum(['dive_logs', 'certifications', 'bookings', 'favorites']),
  entityId: z.string().uuid().optional(),
  payload: z.record(z.unknown()),
}).refine(
  (data) => data.action === 'create' || data.entityId,
  { message: 'entityId is required for update and delete actions', path: ['entityId'] }
);

export const submitSyncSchema = z.object({
  deviceId: z.string().uuid().optional(),
  items: z.array(syncItemSchema).min(1).max(100),
});

export const confirmSyncSchema = z.object({
  clientIds: z.array(z.string().min(1).max(100)).min(1).max(100),
});

export const deltaSyncQuerySchema = z.object({
  since: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

export const syncStatusQuerySchema = z.object({
  deviceId: z.string().uuid().optional(),
  status: z.enum(['pending', 'failed']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
