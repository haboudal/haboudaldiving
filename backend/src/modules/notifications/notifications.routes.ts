import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import * as notificationsController from './notifications.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================================================
// USER ROUTES
// ============================================================================

/**
 * @route   GET /api/v1/notifications
 * @desc    Get current user's notifications
 * @access  Authenticated
 * @query   type, channel, status, priority, from, to, page, limit
 */
router.get('/', notificationsController.getMyNotifications);

/**
 * @route   GET /api/v1/notifications/unread-count
 * @desc    Get unread notification count (badge)
 * @access  Authenticated
 */
router.get('/unread-count', notificationsController.getUnreadCount);

/**
 * @route   GET /api/v1/notifications/preferences
 * @desc    Get notification preferences
 * @access  Authenticated
 */
router.get('/preferences', notificationsController.getPreferences);

/**
 * @route   PATCH /api/v1/notifications/preferences
 * @desc    Update notification preferences
 * @access  Authenticated
 * @body    email?, sms?, push?, inApp?, types?, quietHoursStart?, quietHoursEnd?, timezone?
 */
router.patch('/preferences', notificationsController.updatePreferences);

/**
 * @route   POST /api/v1/notifications/mark-all-read
 * @desc    Mark all notifications as read
 * @access  Authenticated
 */
router.post('/mark-all-read', notificationsController.markAllAsRead);

/**
 * @route   POST /api/v1/notifications/mark-read
 * @desc    Mark specific notifications as read
 * @access  Authenticated
 * @body    notificationIds[]
 */
router.post('/mark-read', notificationsController.markMultipleAsRead);

/**
 * @route   PATCH /api/v1/notifications/:id/read
 * @desc    Mark single notification as read
 * @access  Authenticated
 */
router.patch('/:id/read', notificationsController.markAsRead);

/**
 * @route   DELETE /api/v1/notifications/:id
 * @desc    Delete a notification
 * @access  Authenticated
 */
router.delete('/:id', notificationsController.deleteNotification);

// ============================================================================
// ADMIN ROUTES
// ============================================================================

/**
 * @route   GET /api/v1/notifications/admin
 * @desc    Get all notifications (admin view)
 * @access  Admin
 * @query   userId?, type, channel, status, priority, from, to, page, limit
 */
router.get('/admin', authorize('admin'), notificationsController.getAllNotifications);

/**
 * @route   POST /api/v1/notifications/send
 * @desc    Send notification to a user
 * @access  Admin
 * @body    userId, type, channels?, title, body, data?, priority?
 */
router.post('/send', authorize('admin'), notificationsController.sendNotification);

/**
 * @route   POST /api/v1/notifications/send-bulk
 * @desc    Send notification to multiple users
 * @access  Admin
 * @body    userIds[], type, channels?, title, body, data?, priority?
 */
router.post('/send-bulk', authorize('admin'), notificationsController.sendBulkNotification);

/**
 * @route   POST /api/v1/notifications/send-topic
 * @desc    Send notification to a topic/role
 * @access  Admin
 * @body    topic (all_users|divers|instructors|center_owners|admins), type, title, body, data?, priority?
 */
router.post('/send-topic', authorize('admin'), notificationsController.sendTopicNotification);

/**
 * @route   POST /api/v1/notifications/:id/retry
 * @desc    Retry a failed notification
 * @access  Admin
 */
router.post('/:id/retry', authorize('admin'), notificationsController.retryNotification);

export default router;
