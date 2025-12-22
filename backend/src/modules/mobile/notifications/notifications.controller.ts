import { Request, Response } from 'express';
import { notificationsService } from './notifications.service';
import { asyncHandler, paginate } from '../../../utils/helpers';
import { NotificationFilters } from '../mobile.types';

export class NotificationsController {
  /**
   * GET /mobile/notifications
   * List user's notifications
   */
  list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const filters: NotificationFilters = {
      type: req.query.type as string,
      read: req.query.read !== undefined ? req.query.read === 'true' : undefined,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    };

    const { notifications, total } = await notificationsService.findByUser(
      req.user!.userId,
      filters
    );

    res.json({
      success: true,
      ...paginate(notifications, total, { page: filters.page, limit: filters.limit }),
    });
  });

  /**
   * GET /mobile/notifications/unread-count
   * Get unread notification count
   */
  getUnreadCount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = await notificationsService.getUnreadCount(req.user!.userId);

    // Also set as response header for convenience
    res.set('X-Unread-Count', result.count.toString());

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * PATCH /mobile/notifications/:id/read
   * Mark notification as read
   */
  markAsRead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const notification = await notificationsService.markAsRead(
      req.params.id,
      req.user!.userId
    );

    res.json({
      success: true,
      data: notification,
    });
  });

  /**
   * POST /mobile/notifications/mark-all-read
   * Mark all notifications as read
   */
  markAllAsRead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = await notificationsService.markAllAsRead(req.user!.userId);

    res.json({
      success: true,
      message: `${result.updated} notifications marked as read`,
      data: result,
    });
  });

  /**
   * DELETE /mobile/notifications/:id
   * Delete a notification
   */
  delete = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await notificationsService.delete(req.params.id, req.user!.userId);

    res.json({
      success: true,
      message: 'Notification deleted successfully',
    });
  });
}

export const notificationsController = new NotificationsController();
