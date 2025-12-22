/**
 * @openapi
 * /trips:
 *   get:
 *     tags: [Trips]
 *     summary: List diving trips
 *     description: Get a paginated list of available diving trips
 *     security: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [draft, published, full, cancelled, completed]
 *         description: Filter by status
 *       - name: centerId
 *         in: query
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by center
 *       - name: siteId
 *         in: query
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by dive site
 *       - name: from
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date filter
 *       - name: to
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *         description: End date filter
 *       - name: minPrice
 *         in: query
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - name: maxPrice
 *         in: query
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *       - name: hasAvailability
 *         in: query
 *         schema:
 *           type: boolean
 *         description: Only show trips with available spots
 *     responses:
 *       200:
 *         description: Trips retrieved
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
 *                     allOf:
 *                       - $ref: '#/components/schemas/Trip'
 *                       - type: object
 *                         properties:
 *                           center:
 *                             $ref: '#/components/schemas/DivingCenter'
 *                           site:
 *                             $ref: '#/components/schemas/DiveSite'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *
 * /trips/{id}:
 *   get:
 *     tags: [Trips]
 *     summary: Get trip details
 *     description: Retrieve detailed information about a diving trip
 *     security: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Trip details retrieved
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
 *                     - $ref: '#/components/schemas/Trip'
 *                     - type: object
 *                       properties:
 *                         center:
 *                           $ref: '#/components/schemas/DivingCenter'
 *                         site:
 *                           $ref: '#/components/schemas/DiveSite'
 *                         vessel:
 *                           $ref: '#/components/schemas/Vessel'
 *                         instructors:
 *                           type: array
 *                           items:
 *                             type: object
 *                         conservationFee:
 *                           type: number
 *                           example: 50
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 * /trips/center/{centerId}:
 *   post:
 *     tags: [Trips]
 *     summary: Create trip
 *     description: Create a new diving trip for a center (center owner/staff only)
 *     parameters:
 *       - name: centerId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TripCreate'
 *     responses:
 *       201:
 *         description: Trip created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Trip'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /trips/{id}/publish:
 *   post:
 *     tags: [Trips]
 *     summary: Publish trip
 *     description: Publish a draft trip, making it visible and bookable
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Trip published
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 * /trips/{id}/cancel:
 *   post:
 *     tags: [Trips]
 *     summary: Cancel trip
 *     description: Cancel a trip (triggers refunds for all bookings)
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
 *                 example: "Weather conditions"
 *     responses:
 *       200:
 *         description: Trip cancelled
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 * /trips/{tripId}/bookings:
 *   post:
 *     tags: [Bookings]
 *     summary: Create booking
 *     description: Book a spot on a diving trip
 *     parameters:
 *       - name: tripId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BookingCreate'
 *     responses:
 *       201:
 *         description: Booking created (pending payment)
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
 *                     - $ref: '#/components/schemas/Booking'
 *                     - type: object
 *                       properties:
 *                         paymentUrl:
 *                           type: string
 *                           format: uri
 *                           description: URL to complete payment
 *       400:
 *         description: Trip full or booking not allowed
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 * /trips/bookings/my:
 *   get:
 *     tags: [Bookings]
 *     summary: Get my bookings
 *     description: List all bookings for the authenticated user
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, cancelled, completed, no_show]
 *     responses:
 *       200:
 *         description: Bookings retrieved
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
 *                     allOf:
 *                       - $ref: '#/components/schemas/Booking'
 *                       - type: object
 *                         properties:
 *                           trip:
 *                             $ref: '#/components/schemas/Trip'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 * /trips/bookings/{id}:
 *   get:
 *     tags: [Bookings]
 *     summary: Get booking details
 *     description: Retrieve detailed information about a booking
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Booking details retrieved
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
 *                     - $ref: '#/components/schemas/Booking'
 *                     - type: object
 *                       properties:
 *                         trip:
 *                           $ref: '#/components/schemas/Trip'
 *                         payment:
 *                           $ref: '#/components/schemas/Payment'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 * /trips/bookings/{id}/cancel:
 *   post:
 *     tags: [Bookings]
 *     summary: Cancel booking
 *     description: Cancel a booking (refund policy applies)
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
 *     responses:
 *       200:
 *         description: Booking cancelled
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
 *                     booking:
 *                       $ref: '#/components/schemas/Booking'
 *                     refundAmount:
 *                       type: number
 *                       example: 350
 *                     refundPercentage:
 *                       type: number
 *                       example: 100
 *       400:
 *         description: Booking cannot be cancelled
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 * /trips/{tripId}/eligibility:
 *   get:
 *     tags: [Bookings]
 *     summary: Check booking eligibility
 *     description: Check if the user is eligible to book a specific trip
 *     parameters:
 *       - name: tripId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Eligibility checked
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
 *                     eligible:
 *                       type: boolean
 *                       example: true
 *                     reasons:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: []
 *                     requirements:
 *                       type: object
 *                       properties:
 *                         certificationMet:
 *                           type: boolean
 *                         insuranceValid:
 *                           type: boolean
 *                         medicalClearance:
 *                           type: boolean
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 * /trips/{tripId}/price:
 *   post:
 *     tags: [Bookings]
 *     summary: Calculate booking price
 *     description: Get a price breakdown for a potential booking
 *     parameters:
 *       - name: tripId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [participantCount]
 *             properties:
 *               participantCount:
 *                 type: integer
 *                 minimum: 1
 *               equipmentRental:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Price calculated
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
 *                     basePrice:
 *                       type: number
 *                       example: 700
 *                     equipmentFee:
 *                       type: number
 *                       example: 100
 *                     conservationFee:
 *                       type: number
 *                       example: 100
 *                     insuranceFee:
 *                       type: number
 *                       example: 50
 *                     vat:
 *                       type: number
 *                       example: 142.50
 *                     total:
 *                       type: number
 *                       example: 1092.50
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 * /trips/{tripId}/waitlist:
 *   post:
 *     tags: [Bookings]
 *     summary: Join waitlist
 *     description: Join the waitlist for a full trip
 *     parameters:
 *       - name: tripId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       201:
 *         description: Added to waitlist
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
 *                     position:
 *                       type: integer
 *                       example: 3
 *       400:
 *         description: Trip has availability or already on waitlist
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 *   delete:
 *     tags: [Bookings]
 *     summary: Leave waitlist
 *     description: Remove yourself from a trip's waitlist
 *     parameters:
 *       - name: tripId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Removed from waitlist
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Not on waitlist
 */

export {};
