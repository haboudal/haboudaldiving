/**
 * @openapi
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Get my notifications
 *     description: Retrieve notifications for the authenticated user
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - name: type
 *         in: query
 *         schema:
 *           type: string
 *         description: Filter by notification type
 *       - name: read
 *         in: query
 *         schema:
 *           type: boolean
 *         description: Filter by read status
 *     responses:
 *       200:
 *         description: Notifications retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Notification'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 * /notifications/unread-count:
 *   get:
 *     tags: [Notifications]
 *     summary: Get unread count
 *     description: Get the count of unread notifications
 *     responses:
 *       200:
 *         description: Count retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: integer
 *                       example: 5
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 * /notifications/{id}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark as read
 *     description: Mark a notification as read
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Marked as read
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 * /notifications/mark-all-read:
 *   post:
 *     tags: [Notifications]
 *     summary: Mark all as read
 *     description: Mark all notifications as read
 *     responses:
 *       200:
 *         description: All marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: integer
 *                       description: Number of notifications marked
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 * /notifications/mark-read:
 *   post:
 *     tags: [Notifications]
 *     summary: Mark multiple as read
 *     description: Mark specific notifications as read
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [notificationIds]
 *             properties:
 *               notificationIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 minItems: 1
 *     responses:
 *       200:
 *         description: Notifications marked as read
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 * /notifications/{id}:
 *   delete:
 *     tags: [Notifications]
 *     summary: Delete notification
 *     description: Delete a notification
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Notification deleted
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 * /notifications/preferences:
 *   get:
 *     tags: [Notifications]
 *     summary: Get notification preferences
 *     description: Get the user's notification preferences
 *     responses:
 *       200:
 *         description: Preferences retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/NotificationPreferences'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 *   patch:
 *     tags: [Notifications]
 *     summary: Update notification preferences
 *     description: Update the user's notification preferences
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NotificationPreferences'
 *     responses:
 *       200:
 *         description: Preferences updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/NotificationPreferences'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 * /notifications/admin:
 *   get:
 *     tags: [Notifications, Admin]
 *     summary: List all notifications (Admin)
 *     description: Admin endpoint to view all notifications
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - name: userId
 *         in: query
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: type
 *         in: query
 *         schema:
 *           type: string
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [pending, sent, delivered, failed]
 *     responses:
 *       200:
 *         description: Notifications retrieved
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /notifications/send:
 *   post:
 *     tags: [Notifications, Admin]
 *     summary: Send notification (Admin)
 *     description: Send a notification to a specific user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, type, title, body]
 *             properties:
 *               userId:
 *                 $ref: '#/components/schemas/UUID'
 *               type:
 *                 type: string
 *                 example: "system_announcement"
 *               title:
 *                 type: string
 *                 example: "System Update"
 *               body:
 *                 type: string
 *                 example: "We have updated our terms of service"
 *               channels:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [email, sms, push, in_app]
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high, urgent]
 *               scheduledFor:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Notification sent
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /notifications/send-bulk:
 *   post:
 *     tags: [Notifications, Admin]
 *     summary: Send bulk notifications (Admin)
 *     description: Send notifications to multiple users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userIds, type, title, body]
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 minItems: 1
 *               type:
 *                 type: string
 *               title:
 *                 type: string
 *               body:
 *                 type: string
 *               channels:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Notifications queued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     queued:
 *                       type: integer
 *                       example: 50
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /notifications/send-topic:
 *   post:
 *     tags: [Notifications, Admin]
 *     summary: Send to topic (Admin)
 *     description: Send notification to all users subscribed to a topic
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [topic, type, title, body]
 *             properties:
 *               topic:
 *                 type: string
 *                 enum: [all_users, divers, instructors, center_owners]
 *                 example: "divers"
 *               type:
 *                 type: string
 *                 example: "promotional"
 *               title:
 *                 type: string
 *               body:
 *                 type: string
 *     responses:
 *       201:
 *         description: Notification sent to topic
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /notifications/{id}/retry:
 *   post:
 *     tags: [Notifications, Admin]
 *     summary: Retry failed notification (Admin)
 *     description: Retry sending a failed notification
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Notification retried
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

export {};
