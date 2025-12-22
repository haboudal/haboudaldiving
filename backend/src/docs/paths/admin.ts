/**
 * @openapi
 * /admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: List all users
 *     description: Get a paginated list of all users (Admin only)
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - name: role
 *         in: query
 *         schema:
 *           type: string
 *           enum: [diver, instructor, center_owner, admin]
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [active, inactive, suspended, pending_verification]
 *       - name: search
 *         in: query
 *         schema:
 *           type: string
 *         description: Search by name or email
 *     responses:
 *       200:
 *         description: Users retrieved
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
 *                     $ref: '#/components/schemas/User'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /admin/users/{id}:
 *   get:
 *     tags: [Admin]
 *     summary: Get user details
 *     description: Get detailed information about a user
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: User details retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/User'
 *                     - type: object
 *                       properties:
 *                         diverProfile:
 *                           $ref: '#/components/schemas/DiverProfile'
 *                         bookings:
 *                           type: integer
 *                         totalSpent:
 *                           type: number
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     tags: [Admin]
 *     summary: Update user
 *     description: Update user information (Admin only)
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [diver, instructor, center_owner, admin]
 *               status:
 *                 type: string
 *                 enum: [active, inactive, suspended]
 *               emailVerified:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 * /admin/users/{id}/suspend:
 *   post:
 *     tags: [Admin]
 *     summary: Suspend user
 *     description: Suspend a user account
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *               duration:
 *                 type: string
 *                 description: Duration (e.g., "7d", "30d", "permanent")
 *     responses:
 *       200:
 *         description: User suspended
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /admin/centers:
 *   get:
 *     tags: [Admin]
 *     summary: List all centers
 *     description: Get all diving centers with admin details
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [pending, verified, rejected, suspended]
 *     responses:
 *       200:
 *         description: Centers retrieved
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /admin/centers/{id}/verify:
 *   post:
 *     tags: [Admin]
 *     summary: Verify center
 *     description: Approve a diving center's verification request
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Center verified
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 * /admin/centers/{id}/reject:
 *   post:
 *     tags: [Admin]
 *     summary: Reject center verification
 *     description: Reject a diving center's verification request
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "Invalid SRSA license number"
 *     responses:
 *       200:
 *         description: Center verification rejected
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /admin/certifications:
 *   get:
 *     tags: [Admin]
 *     summary: List certifications pending verification
 *     description: Get all certifications that need verification
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [pending, verified, rejected]
 *     responses:
 *       200:
 *         description: Certifications retrieved
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /admin/certifications/{id}/verify:
 *   post:
 *     tags: [Admin]
 *     summary: Verify certification
 *     description: Approve a diver's certification
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Certification verified
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 * /admin/certifications/{id}/reject:
 *   post:
 *     tags: [Admin]
 *     summary: Reject certification
 *     description: Reject a diver's certification
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Certification rejected
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /admin/bookings:
 *   get:
 *     tags: [Admin]
 *     summary: List all bookings
 *     description: Get all bookings with filters
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, cancelled, completed]
 *       - name: centerId
 *         in: query
 *         schema:
 *           type: string
 *           format: uuid
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
 *         description: Bookings retrieved
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /admin/payments:
 *   get:
 *     tags: [Admin]
 *     summary: List all payments
 *     description: Get all payments with filters
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [pending, completed, failed, refunded]
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
 *         description: Payments retrieved
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /admin/dashboard:
 *   get:
 *     tags: [Admin]
 *     summary: Get dashboard stats
 *     description: Get admin dashboard statistics
 *     responses:
 *       200:
 *         description: Dashboard stats retrieved
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
 *                     users:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         newToday:
 *                           type: integer
 *                         active:
 *                           type: integer
 *                     bookings:
 *                       type: object
 *                       properties:
 *                         today:
 *                           type: integer
 *                         thisWeek:
 *                           type: integer
 *                         revenue:
 *                           type: number
 *                     pendingActions:
 *                       type: object
 *                       properties:
 *                         centerVerifications:
 *                           type: integer
 *                         certificationVerifications:
 *                           type: integer
 *                         refundRequests:
 *                           type: integer
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */

export {};
