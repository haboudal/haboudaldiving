/**
 * @openapi
 * /payments/initiate:
 *   post:
 *     tags: [Payments]
 *     summary: Initiate payment
 *     description: |
 *       Start a payment flow for a booking. Returns a checkout URL
 *       for the selected payment method (HyperPay integration).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentInitiate'
 *     responses:
 *       200:
 *         description: Payment initiated
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
 *                     checkoutId:
 *                       type: string
 *                       description: HyperPay checkout ID
 *                     checkoutUrl:
 *                       type: string
 *                       format: uri
 *                       description: URL to redirect user for payment
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid booking or already paid
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 * /payments/callback:
 *   get:
 *     tags: [Payments]
 *     summary: Payment callback
 *     description: |
 *       Callback endpoint for HyperPay to notify payment completion.
 *       This is called automatically by the payment gateway.
 *     security: []
 *     parameters:
 *       - name: id
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Checkout ID
 *       - name: resourcePath
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: HyperPay resource path
 *     responses:
 *       302:
 *         description: Redirects to success or failure URL
 *
 * /payments/webhook:
 *   post:
 *     tags: [Payments]
 *     summary: Payment webhook
 *     description: |
 *       Webhook endpoint for asynchronous payment notifications.
 *       Handles payment status updates from HyperPay.
 *     security: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed
 *
 * /payments/{id}:
 *   get:
 *     tags: [Payments]
 *     summary: Get payment details
 *     description: Retrieve detailed information about a payment
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Payment details retrieved
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
 *                     - $ref: '#/components/schemas/Payment'
 *                     - type: object
 *                       properties:
 *                         booking:
 *                           $ref: '#/components/schemas/Booking'
 *                         breakdown:
 *                           type: object
 *                           properties:
 *                             baseAmount:
 *                               type: number
 *                             conservationFee:
 *                               type: number
 *                             equipmentFee:
 *                               type: number
 *                             vat:
 *                               type: number
 *                             platformFee:
 *                               type: number
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 * /payments/{id}/status:
 *   get:
 *     tags: [Payments]
 *     summary: Check payment status
 *     description: Get the current status of a payment
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Payment status retrieved
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
 *                     status:
 *                       type: string
 *                       enum: [pending, processing, completed, failed, refunded]
 *                     paidAt:
 *                       type: string
 *                       format: date-time
 *                     failureReason:
 *                       type: string
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 * /payments/{id}/refund:
 *   post:
 *     tags: [Payments]
 *     summary: Request refund
 *     description: |
 *       Request a refund for a completed payment. Refund amount depends
 *       on the cancellation policy and time before the trip.
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
 *                 example: "Unable to attend due to illness"
 *               amount:
 *                 type: number
 *                 description: Partial refund amount (admin only)
 *     responses:
 *       200:
 *         description: Refund initiated
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
 *                     refundId:
 *                       type: string
 *                     refundAmount:
 *                       type: number
 *                       example: 350
 *                     refundPercentage:
 *                       type: number
 *                       example: 100
 *                     status:
 *                       type: string
 *                       example: "processing"
 *                     estimatedCompletion:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Payment not eligible for refund
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 * /payments/my:
 *   get:
 *     tags: [Payments]
 *     summary: Get my payments
 *     description: List all payments made by the authenticated user
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [pending, processing, completed, failed, refunded]
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
 *                     $ref: '#/components/schemas/Payment'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 * /payments/methods:
 *   get:
 *     tags: [Payments]
 *     summary: Get available payment methods
 *     description: List all supported payment methods
 *     security: []
 *     responses:
 *       200:
 *         description: Payment methods retrieved
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "mada"
 *                       name:
 *                         type: string
 *                         example: "Mada Card"
 *                       nameAr:
 *                         type: string
 *                         example: "بطاقة مدى"
 *                       icon:
 *                         type: string
 *                         format: uri
 *                       enabled:
 *                         type: boolean
 *                         example: true
 */

export {};
