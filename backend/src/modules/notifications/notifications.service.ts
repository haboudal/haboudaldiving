import { db } from '../../config/database';
import { logger } from '../../utils/logger';
import { NotFoundError } from '../../utils/errors';
import { emailProvider } from './providers/email.provider';
import { smsProvider } from './providers/sms.provider';
import { pushProvider } from './providers/push.provider';
import { templateService } from './templates';
import {
  Notification,
  NotificationChannel,
  NotificationType,
  NotificationPriority,
  NotificationStatus,
  NotificationPreferences,
  NotificationFilters,
  SendNotificationDto,
  BulkNotificationDto,
  TemplateContext,
  EmailOptions,
  SmsOptions,
  PushOptions,
} from './notifications.types';
import { paginate, PaginatedResult } from '../../utils/helpers';

class NotificationsService {
  // ============================================================================
  // SEND NOTIFICATIONS
  // ============================================================================

  /**
   * Send notification to a single user
   */
  async send(dto: SendNotificationDto): Promise<Notification[]> {
    const user = await this.getUserInfo(dto.userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const preferences = await this.getPreferences(dto.userId);
    const channels = dto.channels || this.getDefaultChannels(dto.type);
    const filteredChannels = this.filterByPreferences(channels, preferences, dto.type);

    const notifications: Notification[] = [];

    for (const channel of filteredChannels) {
      if (this.isInQuietHours(preferences)) {
        logger.info('Notification delayed due to quiet hours', {
          userId: dto.userId,
          channel,
        });
        // Schedule for later (simplified - just skip for now)
        continue;
      }

      const notification = await this.createNotification({
        userId: dto.userId,
        type: dto.type,
        channel,
        title: dto.title,
        body: dto.body,
        data: dto.data,
        priority: dto.priority || 'normal',
      });

      const context: TemplateContext = {
        user: {
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
        },
        ...dto.data,
      };

      await this.deliverNotification(notification, user, context);
      notifications.push(notification);
    }

    return notifications;
  }

  /**
   * Send notification to multiple users
   */
  async sendBulk(dto: BulkNotificationDto): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const userId of dto.userIds) {
      try {
        await this.send({
          userId,
          type: dto.type,
          channels: dto.channels,
          title: dto.title,
          body: dto.body,
          data: dto.data,
          priority: dto.priority,
        });
        sent++;
      } catch (error) {
        logger.error('Failed to send bulk notification', { userId, error });
        failed++;
      }
    }

    return { sent, failed };
  }

  /**
   * Send to users by topic/role
   */
  async sendToTopic(
    topic: 'all_users' | 'divers' | 'instructors' | 'center_owners' | 'admins',
    dto: Omit<BulkNotificationDto, 'userIds'>
  ): Promise<{ sent: number; failed: number }> {
    const roleMap: Record<string, string> = {
      all_users: '',
      divers: 'diver',
      instructors: 'instructor',
      center_owners: 'center_owner',
      admins: 'admin',
    };

    const role = roleMap[topic];
    let query = "SELECT id FROM users WHERE status = 'active'";
    const params: string[] = [];

    if (role) {
      query += ' AND role = $1';
      params.push(role);
    }

    const result = await db.query<{ id: string }>(query, params);
    const userIds = result.rows.map((row) => row.id);

    return this.sendBulk({ ...dto, userIds });
  }

  // ============================================================================
  // NOTIFICATION MANAGEMENT
  // ============================================================================

  /**
   * Get user's notifications
   */
  async getNotifications(
    filters: NotificationFilters
  ): Promise<PaginatedResult<Notification>> {
    const { page = 1, limit = 20, ...rest } = filters;
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (rest.userId) {
      conditions.push(`user_id = $${paramIndex++}`);
      values.push(rest.userId);
    }

    if (rest.type) {
      conditions.push(`type = $${paramIndex++}`);
      values.push(rest.type);
    }

    if (rest.channel) {
      conditions.push(`channel = $${paramIndex++}`);
      values.push(rest.channel);
    }

    if (rest.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(rest.status);
    }

    if (rest.priority) {
      conditions.push(`priority = $${paramIndex++}`);
      values.push(rest.priority);
    }

    if (rest.from) {
      conditions.push(`created_at >= $${paramIndex++}`);
      values.push(rest.from);
    }

    if (rest.to) {
      conditions.push(`created_at <= $${paramIndex++}`);
      values.push(rest.to);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await db.query<{ count: string }>(
      `SELECT COUNT(*) FROM notifications ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await db.query<{
      id: string;
      user_id: string;
      type: string;
      channel: string;
      title: string;
      body: string;
      data: Record<string, unknown> | null;
      priority: string;
      status: string;
      sent_at: Date | null;
      delivered_at: Date | null;
      read_at: Date | null;
      error_message: string | null;
      retry_count: number;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT * FROM notifications ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...values, limit, offset]
    );

    const notifications = result.rows.map(this.mapNotification);

    return paginate(notifications, total, { page, limit });
  }

  /**
   * Get unread count for user
   */
  async getUnreadCount(userId: string): Promise<number> {
    const result = await db.query<{ count: string }>(
      `SELECT COUNT(*) FROM notifications
       WHERE user_id = $1 AND channel = 'in_app' AND read_at IS NULL`,
      [userId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Mark notifications as read
   */
  async markAsRead(userId: string, notificationIds: string[]): Promise<void> {
    await db.query(
      `UPDATE notifications SET read_at = NOW(), updated_at = NOW()
       WHERE user_id = $1 AND id = ANY($2) AND read_at IS NULL`,
      [userId, notificationIds]
    );
  }

  /**
   * Mark all as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    await db.query(
      `UPDATE notifications SET read_at = NOW(), updated_at = NOW()
       WHERE user_id = $1 AND channel = 'in_app' AND read_at IS NULL`,
      [userId]
    );
  }

  /**
   * Delete notification
   */
  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    const result = await db.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );

    if (result.rowCount === 0) {
      throw new NotFoundError('Notification not found');
    }
  }

  /**
   * Retry failed notification
   */
  async retry(notificationId: string): Promise<Notification> {
    const result = await db.query<{
      id: string;
      user_id: string;
      type: string;
      channel: string;
      title: string;
      body: string;
      data: Record<string, unknown> | null;
      priority: string;
      status: string;
      retry_count: number;
    }>(
      `SELECT * FROM notifications WHERE id = $1 AND status = 'failed'`,
      [notificationId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Failed notification not found');
    }

    const notification = result.rows[0];

    if (notification.retry_count >= 3) {
      throw new Error('Maximum retry attempts reached');
    }

    const user = await this.getUserInfo(notification.user_id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const context: TemplateContext = {
      user: {
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
      },
      ...notification.data,
    };

    await db.query(
      `UPDATE notifications SET retry_count = retry_count + 1, updated_at = NOW()
       WHERE id = $1`,
      [notificationId]
    );

    await this.deliverNotification(
      this.mapNotification(notification as never),
      user,
      context
    );

    const updated = await db.query<typeof notification>(
      'SELECT * FROM notifications WHERE id = $1',
      [notificationId]
    );

    return this.mapNotification(updated.rows[0] as never);
  }

  // ============================================================================
  // PREFERENCES
  // ============================================================================

  /**
   * Get user's notification preferences
   */
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const result = await db.query<{
      user_id: string;
      email_enabled: boolean;
      sms_enabled: boolean;
      push_enabled: boolean;
      in_app_enabled: boolean;
      notification_types: Record<string, boolean> | null;
      quiet_hours_start: string | null;
      quiet_hours_end: string | null;
      timezone: string | null;
    }>(
      'SELECT * FROM user_preferences WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      // Return defaults
      return {
        userId,
        email: true,
        sms: false,
        push: true,
        inApp: true,
        types: {},
      };
    }

    const row = result.rows[0];
    return {
      userId: row.user_id,
      email: row.email_enabled,
      sms: row.sms_enabled,
      push: row.push_enabled,
      inApp: row.in_app_enabled,
      types: row.notification_types || {},
      quietHoursStart: row.quiet_hours_start || undefined,
      quietHoursEnd: row.quiet_hours_end || undefined,
      timezone: row.timezone || undefined,
    };
  }

  /**
   * Update preferences
   */
  async updatePreferences(
    userId: string,
    updates: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const current = await this.getPreferences(userId);

    const merged = {
      ...current,
      ...updates,
      types: { ...current.types, ...updates.types },
    };

    await db.query(
      `INSERT INTO user_preferences (
        user_id, email_enabled, sms_enabled, push_enabled, in_app_enabled,
        notification_types, quiet_hours_start, quiet_hours_end, timezone
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (user_id) DO UPDATE SET
        email_enabled = EXCLUDED.email_enabled,
        sms_enabled = EXCLUDED.sms_enabled,
        push_enabled = EXCLUDED.push_enabled,
        in_app_enabled = EXCLUDED.in_app_enabled,
        notification_types = EXCLUDED.notification_types,
        quiet_hours_start = EXCLUDED.quiet_hours_start,
        quiet_hours_end = EXCLUDED.quiet_hours_end,
        timezone = EXCLUDED.timezone,
        updated_at = NOW()`,
      [
        userId,
        merged.email,
        merged.sms,
        merged.push,
        merged.inApp,
        JSON.stringify(merged.types),
        merged.quietHoursStart || null,
        merged.quietHoursEnd || null,
        merged.timezone || null,
      ]
    );

    return merged;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private async getUserInfo(userId: string): Promise<{
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone_number: string | null;
  } | null> {
    const result = await db.query<{
      id: string;
      email: string;
      first_name: string;
      last_name: string;
      phone_number: string | null;
    }>(
      'SELECT id, email, first_name, last_name, phone_number FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0] || null;
  }

  private async getUserPushTokens(userId: string): Promise<string[]> {
    const result = await db.query<{ push_token: string }>(
      `SELECT push_token FROM mobile_devices
       WHERE user_id = $1 AND push_token IS NOT NULL AND is_active = true`,
      [userId]
    );
    return result.rows.map((row) => row.push_token);
  }

  private async createNotification(data: {
    userId: string;
    type: NotificationType;
    channel: NotificationChannel;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    priority: NotificationPriority;
  }): Promise<Notification> {
    const result = await db.query<{
      id: string;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO notifications (
        user_id, type, channel, title, body, data, priority, status, retry_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 0)
      RETURNING id, created_at, updated_at`,
      [
        data.userId,
        data.type,
        data.channel,
        data.title,
        data.body,
        data.data ? JSON.stringify(data.data) : null,
        data.priority,
      ]
    );

    return {
      id: result.rows[0].id,
      userId: data.userId,
      type: data.type,
      channel: data.channel,
      title: data.title,
      body: data.body,
      data: data.data,
      priority: data.priority,
      status: 'pending',
      retryCount: 0,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
    };
  }

  private async deliverNotification(
    notification: Notification,
    user: { email: string; phone_number: string | null; first_name: string; last_name: string },
    context: TemplateContext
  ): Promise<void> {
    const template = templateService.getTemplate(notification.type, notification.channel);
    let title = notification.title;
    let body = notification.body;
    let html: string | undefined;
    let subject: string | undefined;

    if (template) {
      const rendered = templateService.render(template, context);
      title = rendered.title;
      body = rendered.body;
      html = rendered.html;
      subject = rendered.subject;
    }

    try {
      switch (notification.channel) {
        case 'email':
          const emailOptions: EmailOptions = {
            to: { email: user.email, name: `${user.first_name} ${user.last_name}` },
            subject: subject || title,
            html,
            text: body,
          };
          const emailResult = await emailProvider.send(emailOptions);
          await this.updateNotificationStatus(
            notification.id,
            emailResult.success ? 'sent' : 'failed',
            emailResult.error
          );
          break;

        case 'sms':
          if (!user.phone_number) {
            await this.updateNotificationStatus(notification.id, 'failed', 'No phone number');
            return;
          }
          const smsOptions: SmsOptions = {
            to: user.phone_number,
            message: body,
          };
          const smsResult = await smsProvider.send(smsOptions);
          await this.updateNotificationStatus(
            notification.id,
            smsResult.success ? 'sent' : 'failed',
            smsResult.error
          );
          break;

        case 'push':
          const tokens = await this.getUserPushTokens(notification.userId);
          if (tokens.length === 0) {
            await this.updateNotificationStatus(notification.id, 'failed', 'No push tokens');
            return;
          }
          const pushOptions: PushOptions = {
            tokens,
            payload: {
              title,
              body,
              data: notification.data as Record<string, string>,
            },
            priority: notification.priority === 'urgent' ? 'high' : 'normal',
          };
          const pushResult = await pushProvider.send(pushOptions);
          await this.updateNotificationStatus(
            notification.id,
            pushResult.successCount > 0 ? 'sent' : 'failed',
            pushResult.failureCount > 0 ? 'Some tokens failed' : undefined
          );
          break;

        case 'in_app':
          // In-app notifications are already stored, just mark as delivered
          await this.updateNotificationStatus(notification.id, 'delivered');
          break;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to deliver notification', {
        notificationId: notification.id,
        channel: notification.channel,
        error: errorMessage,
      });
      await this.updateNotificationStatus(notification.id, 'failed', errorMessage);
    }
  }

  private async updateNotificationStatus(
    id: string,
    status: NotificationStatus,
    errorMessage?: string
  ): Promise<void> {
    const updates = ['status = $2', 'updated_at = NOW()'];
    const values: unknown[] = [id, status];
    let paramIndex = 3;

    if (status === 'sent') {
      updates.push(`sent_at = NOW()`);
    } else if (status === 'delivered') {
      updates.push(`delivered_at = NOW()`);
    }

    if (errorMessage) {
      updates.push(`error_message = $${paramIndex++}`);
      values.push(errorMessage);
    }

    await db.query(
      `UPDATE notifications SET ${updates.join(', ')} WHERE id = $1`,
      values
    );
  }

  private getDefaultChannels(type: NotificationType): NotificationChannel[] {
    // Define default channels for each notification type
    const defaults: Partial<Record<NotificationType, NotificationChannel[]>> = {
      email_verification: ['email'],
      password_reset: ['email', 'sms'],
      booking_confirmation: ['email', 'push', 'in_app'],
      booking_reminder: ['push', 'sms'],
      booking_cancelled: ['email', 'push', 'in_app'],
      payment_successful: ['email', 'push'],
      payment_failed: ['email', 'push'],
      trip_cancelled: ['email', 'push', 'sms'],
      system_announcement: ['email', 'push', 'in_app'],
    };

    return defaults[type] || ['in_app'];
  }

  private filterByPreferences(
    channels: NotificationChannel[],
    preferences: NotificationPreferences,
    type: NotificationType
  ): NotificationChannel[] {
    // Check if this notification type is disabled
    if (preferences.types[type] === false) {
      return [];
    }

    return channels.filter((channel) => {
      switch (channel) {
        case 'email':
          return preferences.email;
        case 'sms':
          return preferences.sms;
        case 'push':
          return preferences.push;
        case 'in_app':
          return preferences.inApp;
        default:
          return false;
      }
    });
  }

  private isInQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quietHoursStart || !preferences.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const timezone = preferences.timezone || 'Asia/Riyadh';

    // Get current time in user's timezone
    const timeString = now.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });

    const [startHour, startMin] = preferences.quietHoursStart.split(':').map(Number);
    const [endHour, endMin] = preferences.quietHoursEnd.split(':').map(Number);
    const [currentHour, currentMin] = timeString.split(':').map(Number);

    const currentMins = currentHour * 60 + currentMin;
    const startMins = startHour * 60 + startMin;
    const endMins = endHour * 60 + endMin;

    if (startMins <= endMins) {
      return currentMins >= startMins && currentMins <= endMins;
    } else {
      // Quiet hours span midnight
      return currentMins >= startMins || currentMins <= endMins;
    }
  }

  private mapNotification(row: {
    id: string;
    user_id: string;
    type: string;
    channel: string;
    title: string;
    body: string;
    data: Record<string, unknown> | null;
    priority: string;
    status: string;
    sent_at: Date | null;
    delivered_at: Date | null;
    read_at: Date | null;
    error_message: string | null;
    retry_count: number;
    created_at: Date;
    updated_at: Date;
  }): Notification {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type as NotificationType,
      channel: row.channel as NotificationChannel,
      title: row.title,
      body: row.body,
      data: row.data || undefined,
      priority: row.priority as NotificationPriority,
      status: row.status as NotificationStatus,
      sentAt: row.sent_at || undefined,
      deliveredAt: row.delivered_at || undefined,
      readAt: row.read_at || undefined,
      errorMessage: row.error_message || undefined,
      retryCount: row.retry_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const notificationsService = new NotificationsService();
