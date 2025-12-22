/**
 * @openapi
 * /analytics/overview:
 *   get:
 *     tags: [Analytics]
 *     summary: Platform overview
 *     description: Get platform-wide statistics and KPIs
 *     parameters:
 *       - name: from
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *       - name: to
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *       - name: compare
 *         in: query
 *         schema:
 *           type: string
 *           enum: [previous_period, previous_year]
 *         description: Compare with previous period
 *     responses:
 *       200:
 *         description: Overview retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PlatformOverview'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /analytics/users:
 *   get:
 *     tags: [Analytics]
 *     summary: User analytics
 *     description: Get user-related analytics and trends
 *     parameters:
 *       - name: from
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *       - name: to
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *       - name: granularity
 *         in: query
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *     responses:
 *       200:
 *         description: User analytics retrieved
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
 *                     registrations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                           count:
 *                             type: integer
 *                     byRole:
 *                       type: object
 *                       properties:
 *                         divers:
 *                           type: integer
 *                         instructors:
 *                           type: integer
 *                         center_owners:
 *                           type: integer
 *                     retention:
 *                       type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /analytics/bookings:
 *   get:
 *     tags: [Analytics]
 *     summary: Booking analytics
 *     description: Get booking-related analytics and trends
 *     parameters:
 *       - name: from
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *       - name: to
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *       - name: granularity
 *         in: query
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *       - name: centerId
 *         in: query
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Booking analytics retrieved
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
 *                     total:
 *                       type: integer
 *                     byStatus:
 *                       type: object
 *                     trend:
 *                       type: array
 *                       items:
 *                         type: object
 *                     averageValue:
 *                       type: number
 *                     cancellationRate:
 *                       type: number
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /analytics/revenue:
 *   get:
 *     tags: [Analytics]
 *     summary: Revenue analytics
 *     description: Get revenue analytics and financial reports
 *     parameters:
 *       - name: from
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *       - name: to
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *       - name: granularity
 *         in: query
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *     responses:
 *       200:
 *         description: Revenue analytics retrieved
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
 *                     total:
 *                       type: number
 *                       example: 2500000
 *                     breakdown:
 *                       type: object
 *                       properties:
 *                         baseFees:
 *                           type: number
 *                         equipmentFees:
 *                           type: number
 *                         conservationFees:
 *                           type: number
 *                         insuranceFees:
 *                           type: number
 *                         platformFees:
 *                           type: number
 *                         vatCollected:
 *                           type: number
 *                     byCenter:
 *                       type: array
 *                       items:
 *                         type: object
 *                     trend:
 *                       type: array
 *                       items:
 *                         type: object
 *                     refunds:
 *                       type: object
 *                       properties:
 *                         count:
 *                           type: integer
 *                         total:
 *                           type: number
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /analytics/centers/{id}:
 *   get:
 *     tags: [Analytics]
 *     summary: Center analytics
 *     description: Get analytics for a specific diving center
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *       - name: from
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *       - name: to
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Center analytics retrieved
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
 *                     trips:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         completed:
 *                           type: integer
 *                         cancelled:
 *                           type: integer
 *                     bookings:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         revenue:
 *                           type: number
 *                     rating:
 *                       type: object
 *                       properties:
 *                         average:
 *                           type: number
 *                         count:
 *                           type: integer
 *                     fillRate:
 *                       type: number
 *                       example: 0.85
 *                     topSites:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 * /analytics/compliance:
 *   get:
 *     tags: [Analytics]
 *     summary: Compliance analytics
 *     description: Get SRSA compliance and safety analytics
 *     parameters:
 *       - name: from
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *       - name: to
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Compliance analytics retrieved
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
 *                     quotaUtilization:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           siteCode:
 *                             type: string
 *                           siteName:
 *                             type: string
 *                           utilization:
 *                             type: number
 *                     conservationFees:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         byZone:
 *                           type: object
 *                     incidents:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         bySeverity:
 *                           type: object
 *                     certifications:
 *                       type: object
 *                       properties:
 *                         pending:
 *                           type: integer
 *                         verified:
 *                           type: integer
 *                         expired:
 *                           type: integer
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /analytics/reports/{type}:
 *   get:
 *     tags: [Analytics]
 *     summary: Generate report
 *     description: Generate a pre-built analytics report
 *     parameters:
 *       - name: type
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           enum: [daily_summary, weekly_digest, monthly_financial, quarterly_review, center_performance, compliance_audit]
 *       - name: from
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *       - name: to
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Report generated
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /analytics/export:
 *   post:
 *     tags: [Analytics]
 *     summary: Export data
 *     description: Export analytics data in various formats
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reportType, format, dateRange]
 *             properties:
 *               reportType:
 *                 type: string
 *                 enum: [users, bookings, revenue, centers, compliance]
 *               format:
 *                 type: string
 *                 enum: [csv, pdf, excel]
 *               dateRange:
 *                 type: object
 *                 properties:
 *                   from:
 *                     type: string
 *                     format: date
 *                   to:
 *                     type: string
 *                     format: date
 *               filters:
 *                 type: object
 *     responses:
 *       200:
 *         description: Export file generated
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */

export {};
