// Notification module types

// ============================================================================
// ENUMS & BASE TYPES
// ============================================================================

export type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'read';

export type NotificationType =
  // Authentication
  | 'email_verification'
  | 'password_reset'
  | 'login_alert'
  // Bookings
  | 'booking_confirmation'
  | 'booking_reminder'
  | 'booking_cancelled'
  | 'booking_updated'
  | 'waitlist_available'
  // Trips
  | 'trip_reminder'
  | 'trip_cancelled'
  | 'trip_updated'
  | 'check_in_reminder'
  // Payments
  | 'payment_successful'
  | 'payment_failed'
  | 'refund_processed'
  | 'payment_reminder'
  // Center
  | 'center_verified'
  | 'center_rejected'
  | 'new_booking'
  | 'new_review'
  // Certifications
  | 'certification_verified'
  | 'certification_rejected'
  | 'certification_expiring'
  // Guardian/Minor
  | 'consent_requested'
  | 'consent_granted'
  | 'minor_activity'
  // System
  | 'system_announcement'
  | 'account_deactivated'
  | 'promotional';

// ============================================================================
// EMAIL TYPES
// ============================================================================

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface EmailOptions {
  to: EmailRecipient | EmailRecipient[];
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  templateData?: Record<string, unknown>;
  attachments?: EmailAttachment[];
  replyTo?: string;
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ============================================================================
// SMS TYPES
// ============================================================================

export interface SmsOptions {
  to: string;
  message: string;
  template?: string;
  templateData?: Record<string, unknown>;
}

export interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ============================================================================
// PUSH NOTIFICATION TYPES
// ============================================================================

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  image?: string;
  badge?: number;
  sound?: string;
  data?: Record<string, string>;
  clickAction?: string;
}

export interface PushOptions {
  tokens: string[];
  payload: PushNotificationPayload;
  topic?: string;
  condition?: string;
  collapseKey?: string;
  priority?: 'normal' | 'high';
  ttl?: number;
}

export interface PushResult {
  success: boolean;
  successCount: number;
  failureCount: number;
  responses?: Array<{
    token: string;
    success: boolean;
    error?: string;
  }>;
}

// ============================================================================
// NOTIFICATION ENTITY
// ============================================================================

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  priority: NotificationPriority;
  status: NotificationStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  errorMessage?: string;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPreferences {
  userId: string;
  email: boolean;
  sms: boolean;
  push: boolean;
  inApp: boolean;
  types: Partial<Record<NotificationType, boolean>>;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
}

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

export interface SendNotificationDto {
  userId: string;
  type: NotificationType;
  channels?: NotificationChannel[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  priority?: NotificationPriority;
  scheduledFor?: string;
}

export interface BulkNotificationDto {
  userIds: string[];
  type: NotificationType;
  channels?: NotificationChannel[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  priority?: NotificationPriority;
}

export interface NotificationFilters {
  userId?: string;
  type?: NotificationType;
  channel?: NotificationChannel;
  status?: NotificationStatus;
  priority?: NotificationPriority;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// TEMPLATE TYPES
// ============================================================================

export interface NotificationTemplate {
  type: NotificationType;
  channel: NotificationChannel;
  subject?: string;
  title: string;
  body: string;
  htmlTemplate?: string;
}

export interface TemplateContext {
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  [key: string]: unknown;
}

// ============================================================================
// PROVIDER INTERFACES
// ============================================================================

export interface EmailProvider {
  send(options: EmailOptions): Promise<EmailResult>;
  sendBulk(options: EmailOptions[]): Promise<EmailResult[]>;
}

export interface SmsProvider {
  send(options: SmsOptions): Promise<SmsResult>;
  sendBulk(options: SmsOptions[]): Promise<SmsResult[]>;
}

export interface PushProvider {
  send(options: PushOptions): Promise<PushResult>;
  subscribeToTopic(tokens: string[], topic: string): Promise<void>;
  unsubscribeFromTopic(tokens: string[], topic: string): Promise<void>;
}
