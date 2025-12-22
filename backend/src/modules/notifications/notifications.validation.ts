import { z } from 'zod';

// Notification type enum
const notificationTypeSchema = z.enum([
  'email_verification',
  'password_reset',
  'login_alert',
  'booking_confirmation',
  'booking_reminder',
  'booking_cancelled',
  'booking_updated',
  'waitlist_available',
  'trip_reminder',
  'trip_cancelled',
  'trip_updated',
  'check_in_reminder',
  'payment_successful',
  'payment_failed',
  'refund_processed',
  'payment_reminder',
  'center_verified',
  'center_rejected',
  'new_booking',
  'new_review',
  'certification_verified',
  'certification_rejected',
  'certification_expiring',
  'consent_requested',
  'consent_granted',
  'minor_activity',
  'system_announcement',
  'account_deactivated',
  'promotional',
]);

// Channel enum
const channelSchema = z.enum(['email', 'sms', 'push', 'in_app']);

// Priority enum
const prioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);

// Status enum
const statusSchema = z.enum(['pending', 'sent', 'delivered', 'failed', 'read']);

// Send notification schema
export const sendNotificationSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  type: notificationTypeSchema,
  channels: z.array(channelSchema).optional(),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  data: z.record(z.unknown()).optional(),
  priority: prioritySchema.optional().default('normal'),
  scheduledFor: z.string().datetime().optional(),
});

// Bulk notification schema
export const bulkNotificationSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(1000),
  type: notificationTypeSchema,
  channels: z.array(channelSchema).optional(),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  data: z.record(z.unknown()).optional(),
  priority: prioritySchema.optional().default('normal'),
});

// Topic notification schema
export const topicNotificationSchema = z.object({
  topic: z.enum(['all_users', 'divers', 'instructors', 'center_owners', 'admins']),
  type: notificationTypeSchema,
  channels: z.array(channelSchema).optional(),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  data: z.record(z.unknown()).optional(),
  priority: prioritySchema.optional().default('normal'),
});

// Notification filters schema
export const notificationFiltersSchema = z.object({
  userId: z.string().uuid().optional(),
  type: notificationTypeSchema.optional(),
  channel: channelSchema.optional(),
  status: statusSchema.optional(),
  priority: prioritySchema.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

// Notification ID param schema
export const notificationIdParamSchema = z.object({
  id: z.string().uuid('Invalid notification ID'),
});

// Update preferences schema
export const updatePreferencesSchema = z.object({
  email: z.boolean().optional(),
  sms: z.boolean().optional(),
  push: z.boolean().optional(),
  inApp: z.boolean().optional(),
  types: z.record(notificationTypeSchema, z.boolean()).optional(),
  quietHoursStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)').optional().nullable(),
  quietHoursEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)').optional().nullable(),
  timezone: z.string().optional(),
});

// Send email schema (direct)
export const sendEmailSchema = z.object({
  to: z.union([
    z.object({
      email: z.string().email(),
      name: z.string().optional(),
    }),
    z.array(z.object({
      email: z.string().email(),
      name: z.string().optional(),
    })),
  ]),
  subject: z.string().min(1).max(200),
  html: z.string().optional(),
  text: z.string().optional(),
  template: z.string().optional(),
  templateData: z.record(z.unknown()).optional(),
  replyTo: z.string().email().optional(),
}).refine(
  (data) => data.html || data.text || data.template,
  { message: 'Either html, text, or template is required' }
);

// Send SMS schema (direct)
export const sendSmsSchema = z.object({
  to: z.string().regex(/^\+[1-9]\d{6,14}$/, 'Invalid phone number format (E.164)'),
  message: z.string().min(1).max(1600),
  template: z.string().optional(),
  templateData: z.record(z.unknown()).optional(),
});

// Send push schema (direct)
export const sendPushSchema = z.object({
  tokens: z.array(z.string()).min(1).max(500),
  payload: z.object({
    title: z.string().min(1).max(100),
    body: z.string().min(1).max(500),
    icon: z.string().optional(),
    image: z.string().url().optional(),
    badge: z.number().int().min(0).optional(),
    sound: z.string().optional(),
    data: z.record(z.string()).optional(),
    clickAction: z.string().optional(),
  }),
  topic: z.string().optional(),
  collapseKey: z.string().optional(),
  priority: z.enum(['normal', 'high']).optional().default('normal'),
  ttl: z.number().int().min(0).max(2419200).optional(), // Max 28 days
});

// Retry notification schema
export const retryNotificationSchema = z.object({
  id: z.string().uuid('Invalid notification ID'),
});

// Mark as read schema
export const markAsReadSchema = z.object({
  notificationIds: z.array(z.string().uuid()).min(1).max(100),
});
