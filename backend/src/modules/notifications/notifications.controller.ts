import { Request, Response } from 'express';
import { notificationsService } from './notifications.service';
import { asyncHandler } from '../../utils/helpers';
import {
  sendNotificationSchema,
  bulkNotificationSchema,
  topicNotificationSchema,
  notificationFiltersSchema,
  notificationIdParamSchema,
  updatePreferencesSchema,
  markAsReadSchema,
  retryNotificationSchema,
} from './notifications.validation';

// ============================================================================
// USER ENDPOINTS
// ============================================================================

/**
 * GET /notifications
 * Get current user's notifications
 */
export const getMyNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const filters = notificationFiltersSchema.parse(req.query);

  const result = await notificationsService.getNotifications({
    ...filters,
    userId,
  });

  res.json({
    success: true,
    data: result,
  });
});

/**
 * GET /notifications/unread-count
 * Get unread notification count
 */
export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const count = await notificationsService.getUnreadCount(userId);

  res.json({
    success: true,
    data: { count },
  });
});

/**
 * PATCH /notifications/:id/read
 * Mark notification as read
 */
export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = notificationIdParamSchema.parse(req.params);

  await notificationsService.markAsRead(userId, [id]);

  res.json({
    success: true,
    message: 'Notification marked as read',
  });
});

/**
 * POST /notifications/mark-all-read
 * Mark all notifications as read
 */
export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  await notificationsService.markAllAsRead(userId);

  res.json({
    success: true,
    message: 'All notifications marked as read',
  });
});

/**
 * POST /notifications/mark-read
 * Mark specific notifications as read
 */
export const markMultipleAsRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { notificationIds } = markAsReadSchema.parse(req.body);

  await notificationsService.markAsRead(userId, notificationIds);

  res.json({
    success: true,
    message: `${notificationIds.length} notifications marked as read`,
  });
});

/**
 * DELETE /notifications/:id
 * Delete a notification
 */
export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = notificationIdParamSchema.parse(req.params);

  await notificationsService.deleteNotification(userId, id);

  res.json({
    success: true,
    message: 'Notification deleted',
  });
});

/**
 * GET /notifications/preferences
 * Get notification preferences
 */
export const getPreferences = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const preferences = await notificationsService.getPreferences(userId);

  res.json({
    success: true,
    data: preferences,
  });
});

/**
 * PATCH /notifications/preferences
 * Update notification preferences
 */
export const updatePreferences = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const updates = updatePreferencesSchema.parse(req.body);

  // Convert null to undefined for optional fields
  const sanitizedUpdates = {
    ...updates,
    quietHoursStart: updates.quietHoursStart ?? undefined,
    quietHoursEnd: updates.quietHoursEnd ?? undefined,
  };

  const preferences = await notificationsService.updatePreferences(userId, sanitizedUpdates);

  res.json({
    success: true,
    data: preferences,
  });
});

// ============================================================================
// ADMIN ENDPOINTS
// ============================================================================

/**
 * GET /notifications/admin
 * Get all notifications (admin)
 */
export const getAllNotifications = asyncHandler(async (req: Request, res: Response) => {
  const filters = notificationFiltersSchema.parse(req.query);
  const result = await notificationsService.getNotifications(filters);

  res.json({
    success: true,
    data: result,
  });
});

/**
 * POST /notifications/send
 * Send notification to a user (admin)
 */
export const sendNotification = asyncHandler(async (req: Request, res: Response) => {
  const dto = sendNotificationSchema.parse(req.body);
  const notifications = await notificationsService.send(dto);

  res.status(201).json({
    success: true,
    data: notifications,
  });
});

/**
 * POST /notifications/send-bulk
 * Send notification to multiple users (admin)
 */
export const sendBulkNotification = asyncHandler(async (req: Request, res: Response) => {
  const dto = bulkNotificationSchema.parse(req.body);
  const result = await notificationsService.sendBulk(dto);

  res.status(201).json({
    success: true,
    data: result,
  });
});

/**
 * POST /notifications/send-topic
 * Send notification to a topic/role (admin)
 */
export const sendTopicNotification = asyncHandler(async (req: Request, res: Response) => {
  const { topic, ...dto } = topicNotificationSchema.parse(req.body);
  const result = await notificationsService.sendToTopic(topic, dto);

  res.status(201).json({
    success: true,
    data: result,
  });
});

/**
 * POST /notifications/:id/retry
 * Retry a failed notification (admin)
 */
export const retryNotification = asyncHandler(async (req: Request, res: Response) => {
  const { id } = retryNotificationSchema.parse(req.params);
  const notification = await notificationsService.retry(id);

  res.json({
    success: true,
    data: notification,
  });
});
