import { db } from '../../../config/database';
import { NotFoundError, ForbiddenError } from '../../../utils/errors';
import {
  Notification,
  NotificationFilters,
  CreateNotificationDto,
  UnreadCountResponse,
} from '../mobile.types';

export class NotificationsService {
  /**
   * Find notifications for a user with filters
   */
  async findByUser(
    userId: string,
    filters: NotificationFilters
  ): Promise<{ notifications: Notification[]; total: number }> {
    const { type, read, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;
    const params: unknown[] = [userId];
    let paramIndex = 2;
    const conditions: string[] = ['user_id = $1'];

    if (type) {
      conditions.push(`type = $${paramIndex++}`);
      params.push(type);
    }

    if (read !== undefined) {
      if (read) {
        conditions.push('read_at IS NOT NULL');
      } else {
        conditions.push('read_at IS NULL');
      }
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await db.query<{ count: string }>(
      `SELECT COUNT(*) FROM notifications WHERE ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const result = await db.query(
      `SELECT * FROM notifications
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params
    );

    return {
      notifications: result.rows.map(this.mapToNotification),
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<UnreadCountResponse> {
    const result = await db.query<{ count: string }>(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read_at IS NULL',
      [userId]
    );

    return {
      count: parseInt(result.rows[0].count, 10),
    };
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    await this.verifyOwnership(notificationId, userId);

    await db.query(
      'UPDATE notifications SET read_at = NOW() WHERE id = $1 AND read_at IS NULL',
      [notificationId]
    );

    return this.findById(notificationId);
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<{ updated: number }> {
    const result = await db.query(
      'UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL',
      [userId]
    );

    return {
      updated: result.rowCount || 0,
    };
  }

  /**
   * Delete a notification
   */
  async delete(notificationId: string, userId: string): Promise<void> {
    await this.verifyOwnership(notificationId, userId);

    await db.query('DELETE FROM notifications WHERE id = $1', [notificationId]);
  }

  /**
   * Create a notification (internal use)
   */
  async create(dto: CreateNotificationDto): Promise<Notification> {
    const result = await db.query(
      `INSERT INTO notifications (
        user_id, type, title_en, title_ar, body_en, body_ar,
        data, action_url, sent_via
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        dto.userId,
        dto.type,
        dto.titleEn,
        dto.titleAr,
        dto.bodyEn,
        dto.bodyAr,
        dto.data ? JSON.stringify(dto.data) : null,
        dto.actionUrl,
        dto.sentVia || ['in_app'],
      ]
    );

    return this.mapToNotification(result.rows[0]);
  }

  /**
   * Find notification by ID
   */
  async findById(notificationId: string): Promise<Notification> {
    const result = await db.query(
      'SELECT * FROM notifications WHERE id = $1',
      [notificationId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Notification');
    }

    return this.mapToNotification(result.rows[0]);
  }

  /**
   * Verify notification ownership
   */
  private async verifyOwnership(notificationId: string, userId: string): Promise<void> {
    const result = await db.query(
      'SELECT id FROM notifications WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );

    if (result.rows.length === 0) {
      throw new ForbiddenError('Not authorized to access this notification');
    }
  }

  /**
   * Map database row to Notification
   */
  private mapToNotification(row: Record<string, unknown>): Notification {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      type: row.type as string,
      titleEn: row.title_en as string,
      titleAr: row.title_ar as string | null,
      bodyEn: row.body_en as string,
      bodyAr: row.body_ar as string | null,
      data: row.data as Record<string, unknown> | null,
      actionUrl: row.action_url as string | null,
      readAt: row.read_at ? (row.read_at as Date).toISOString() : null,
      sentVia: row.sent_via as string[],
      createdAt: (row.created_at as Date).toISOString(),
    };
  }
}

export const notificationsService = new NotificationsService();
