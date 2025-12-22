import { db } from '../../../config/database';
import {
  UserPreferences,
  UpdatePreferencesDto,
  NotificationTypeSettings,
} from '../mobile.types';

const DEFAULT_NOTIFICATION_TYPES: NotificationTypeSettings = {
  booking_confirmed: true,
  trip_reminder: true,
  payment_received: true,
  new_message: true,
  review_response: true,
};

export class PreferencesService {
  /**
   * Find preferences for a user (creates default if not exists)
   */
  async findByUser(userId: string): Promise<UserPreferences> {
    // Try to find existing preferences
    const result = await db.query(
      'SELECT * FROM user_preferences WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length > 0) {
      return this.mapToPreferences(result.rows[0]);
    }

    // Create default preferences
    const insertResult = await db.query(
      `INSERT INTO user_preferences (user_id, notification_types)
       VALUES ($1, $2)
       RETURNING *`,
      [userId, JSON.stringify(DEFAULT_NOTIFICATION_TYPES)]
    );

    return this.mapToPreferences(insertResult.rows[0]);
  }

  /**
   * Update user preferences
   */
  async update(userId: string, dto: UpdatePreferencesDto): Promise<UserPreferences> {
    // Ensure preferences exist
    await this.findByUser(userId);

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, string> = {
      pushEnabled: 'push_enabled',
      emailEnabled: 'email_enabled',
      smsEnabled: 'sms_enabled',
      inAppEnabled: 'in_app_enabled',
      quietHoursStart: 'quiet_hours_start',
      quietHoursEnd: 'quiet_hours_end',
      timezone: 'timezone',
    };

    for (const [key, dbField] of Object.entries(fieldMap)) {
      const value = dto[key as keyof UpdatePreferencesDto];
      if (value !== undefined) {
        updates.push(`${dbField} = $${paramIndex++}`);
        values.push(value);
      }
    }

    // Handle notification_types merge
    if (dto.notificationTypes) {
      updates.push(`notification_types = notification_types || $${paramIndex++}`);
      values.push(JSON.stringify(dto.notificationTypes));
    }

    if (updates.length > 0) {
      values.push(userId);
      await db.query(
        `UPDATE user_preferences SET ${updates.join(', ')}, updated_at = NOW() WHERE user_id = $${paramIndex}`,
        values
      );
    }

    return this.findByUser(userId);
  }

  /**
   * Reset preferences to defaults
   */
  async reset(userId: string): Promise<UserPreferences> {
    await db.query(
      `UPDATE user_preferences SET
        push_enabled = TRUE,
        email_enabled = TRUE,
        sms_enabled = FALSE,
        in_app_enabled = TRUE,
        notification_types = $1,
        quiet_hours_start = NULL,
        quiet_hours_end = NULL,
        timezone = 'Asia/Riyadh',
        updated_at = NOW()
       WHERE user_id = $2`,
      [JSON.stringify(DEFAULT_NOTIFICATION_TYPES), userId]
    );

    return this.findByUser(userId);
  }

  /**
   * Check if a notification should be sent to a user via a specific channel
   */
  async shouldSendNotification(
    userId: string,
    notificationType: string,
    channel: 'push' | 'email' | 'sms' | 'in_app'
  ): Promise<boolean> {
    const prefs = await this.findByUser(userId);

    // Check channel enabled
    switch (channel) {
      case 'push':
        if (!prefs.pushEnabled) return false;
        break;
      case 'email':
        if (!prefs.emailEnabled) return false;
        break;
      case 'sms':
        if (!prefs.smsEnabled) return false;
        break;
      case 'in_app':
        if (!prefs.inAppEnabled) return false;
        break;
    }

    // Check notification type enabled
    const typeEnabled = prefs.notificationTypes[notificationType];
    if (typeEnabled === false) return false;

    // Check quiet hours for push notifications
    if (channel === 'push' && prefs.quietHoursStart && prefs.quietHoursEnd) {
      if (this.isInQuietHours(prefs)) return false;
    }

    return true;
  }

  /**
   * Check if current time is within quiet hours
   */
  isInQuietHours(prefs: UserPreferences): boolean {
    if (!prefs.quietHoursStart || !prefs.quietHoursEnd) return false;

    // Get current time in user's timezone
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      timeZone: prefs.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    };
    const currentTime = now.toLocaleTimeString('en-US', options);

    const start = prefs.quietHoursStart;
    const end = prefs.quietHoursEnd;

    // Handle overnight quiet hours (e.g., 22:00 - 07:00)
    if (start > end) {
      return currentTime >= start || currentTime <= end;
    }

    return currentTime >= start && currentTime <= end;
  }

  /**
   * Map database row to UserPreferences
   */
  private mapToPreferences(row: Record<string, unknown>): UserPreferences {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      pushEnabled: row.push_enabled as boolean,
      emailEnabled: row.email_enabled as boolean,
      smsEnabled: row.sms_enabled as boolean,
      inAppEnabled: row.in_app_enabled as boolean,
      notificationTypes: row.notification_types as NotificationTypeSettings,
      quietHoursStart: row.quiet_hours_start as string | null,
      quietHoursEnd: row.quiet_hours_end as string | null,
      timezone: row.timezone as string,
      createdAt: (row.created_at as Date).toISOString(),
      updatedAt: (row.updated_at as Date).toISOString(),
    };
  }
}

export const preferencesService = new PreferencesService();
