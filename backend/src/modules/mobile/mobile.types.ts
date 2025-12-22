// Mobile module types

// ============================================================================
// ENUMS
// ============================================================================

export type DeviceType = 'ios' | 'android' | 'web';
export type PushTokenType = 'fcm' | 'apn' | 'web_push';
export type SyncStatus = 'pending' | 'synced' | 'failed' | 'conflict';
export type SyncAction = 'create' | 'update' | 'delete';

export type NotificationType =
  | 'booking_confirmed'
  | 'trip_reminder'
  | 'payment_received'
  | 'new_message'
  | 'review_response'
  | 'trip_cancelled'
  | 'consent_request'
  | 'system';

// ============================================================================
// DEVICE INTERFACES
// ============================================================================

export interface MobileDevice {
  id: string;
  userId: string;
  deviceIdentifier: string;
  deviceType: DeviceType;
  deviceName: string | null;
  osVersion: string | null;
  appVersion: string | null;
  model: string | null;
  pushToken: string | null;
  pushTokenType: PushTokenType | null;
  pushEnabled: boolean;
  isActive: boolean;
  lastUsedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterDeviceDto {
  deviceIdentifier: string;
  deviceType: DeviceType;
  deviceName?: string;
  osVersion?: string;
  appVersion?: string;
  model?: string;
  pushToken?: string;
  pushTokenType?: PushTokenType;
}

export interface UpdateDeviceDto {
  deviceName?: string;
  osVersion?: string;
  appVersion?: string;
  pushToken?: string;
  pushTokenType?: PushTokenType;
  pushEnabled?: boolean;
}

// ============================================================================
// NOTIFICATION INTERFACES
// ============================================================================

export interface Notification {
  id: string;
  userId: string;
  type: string;
  titleEn: string;
  titleAr: string | null;
  bodyEn: string;
  bodyAr: string | null;
  data: Record<string, unknown> | null;
  actionUrl: string | null;
  readAt: string | null;
  sentVia: string[];
  createdAt: string;
}

export interface NotificationFilters {
  type?: string;
  read?: boolean;
  page: number;
  limit: number;
}

export interface CreateNotificationDto {
  userId: string;
  type: NotificationType;
  titleEn: string;
  titleAr?: string;
  bodyEn: string;
  bodyAr?: string;
  data?: Record<string, unknown>;
  actionUrl?: string;
  sentVia?: string[];
}

export interface UnreadCountResponse {
  count: number;
}

// ============================================================================
// PREFERENCES INTERFACES
// ============================================================================

export interface NotificationTypeSettings {
  booking_confirmed: boolean;
  trip_reminder: boolean;
  payment_received: boolean;
  new_message: boolean;
  review_response: boolean;
  [key: string]: boolean;
}

export interface UserPreferences {
  id: string;
  userId: string;
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
  notificationTypes: NotificationTypeSettings;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePreferencesDto {
  pushEnabled?: boolean;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  inAppEnabled?: boolean;
  notificationTypes?: Partial<NotificationTypeSettings>;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  timezone?: string;
}

// ============================================================================
// SYNC INTERFACES
// ============================================================================

export interface SyncQueueItem {
  id: string;
  userId: string;
  deviceId: string | null;
  clientId: string;
  action: SyncAction;
  entityType: string;
  entityId: string | null;
  payload: Record<string, unknown>;
  status: SyncStatus;
  serverEntityId: string | null;
  errorMessage: string | null;
  retryCount: number;
  createdAt: string;
  syncedAt: string | null;
}

export interface SyncItemInput {
  clientId: string;
  action: SyncAction;
  entityType: string;
  entityId?: string;
  payload: Record<string, unknown>;
}

export interface SubmitSyncDto {
  deviceId?: string;
  items: SyncItemInput[];
}

export interface SyncResult {
  clientId: string;
  status: SyncStatus;
  serverEntityId?: string;
  error?: string;
}

export interface SyncStatusResponse {
  pending: number;
  failed: number;
  items: SyncQueueItem[];
}

export interface ConfirmSyncDto {
  clientIds: string[];
}

export interface SyncCheckpoint {
  entityType: string;
  lastSyncAt: string;
  syncToken: string | null;
}

export interface DeltaSyncQuery {
  since?: string;
  limit?: number;
}

export interface DeltaSyncResponse<T> {
  items: T[];
  deleted: string[];
  checkpoint: string;
  hasMore: boolean;
}

export interface InitialSyncResponse<T> {
  items: T[];
  checkpoint: string;
  totalCount: number;
}

// Supported sync entity types
export type SyncEntityType = 'dive_logs' | 'certifications' | 'bookings' | 'favorites';

// ============================================================================
// PAGINATION
// ============================================================================

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}
