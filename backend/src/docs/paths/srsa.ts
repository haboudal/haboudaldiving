/**
 * @openapi
 * /quota/check:
 *   post:
 *     tags: [SRSA]
 *     summary: Check site quota
 *     description: Check availability and quota for a dive site on a specific date
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [siteCode, date, diverCount]
 *             properties:
 *               siteCode:
 *                 type: string
 *                 example: "RS-JED-001"
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2025-01-15"
 *               diverCount:
 *                 type: integer
 *                 minimum: 1
 *                 example: 5
 *     responses:
 *       200:
 *         description: Quota checked
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/QuotaCheck'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 * /quota/reserve:
 *   post:
 *     tags: [SRSA]
 *     summary: Reserve quota
 *     description: Reserve quota slots for a dive site (center owners only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [siteCode, date, diverCount, tripId]
 *             properties:
 *               siteCode:
 *                 type: string
 *                 example: "RS-JED-001"
 *               date:
 *                 type: string
 *                 format: date
 *               diverCount:
 *                 type: integer
 *                 minimum: 1
 *               tripId:
 *                 $ref: '#/components/schemas/UUID'
 *     responses:
 *       201:
 *         description: Quota reserved
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
 *                     reservationId:
 *                       type: string
 *                     siteCode:
 *                       type: string
 *                     date:
 *                       type: string
 *                       format: date
 *                     diverCount:
 *                       type: integer
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Quota not available
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 * /quota/release:
 *   post:
 *     tags: [SRSA]
 *     summary: Release quota
 *     description: Release previously reserved quota slots
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reservationId]
 *             properties:
 *               reservationId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Quota released
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 * /quota/forecast/{siteCode}:
 *   get:
 *     tags: [SRSA]
 *     summary: Get quota forecast
 *     description: Get 7-day quota availability forecast for a site
 *     parameters:
 *       - name: siteCode
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: "RS-JED-001"
 *     responses:
 *       200:
 *         description: Forecast retrieved
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
 *                     siteCode:
 *                       type: string
 *                     siteName:
 *                       type: string
 *                     dailyLimit:
 *                       type: integer
 *                     forecast:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                           reserved:
 *                             type: integer
 *                           available:
 *                             type: integer
 *                           status:
 *                             type: string
 *                             enum: [available, limited, full]
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 * /quota/alternatives:
 *   get:
 *     tags: [SRSA]
 *     summary: Get alternative sites
 *     description: Get alternative dive sites when preferred site is full
 *     parameters:
 *       - name: siteCode
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Original site code
 *       - name: date
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - name: diverCount
 *         in: query
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Alternatives retrieved
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
 *                       site:
 *                         $ref: '#/components/schemas/DiveSite'
 *                       availableSlots:
 *                         type: integer
 *                       distance:
 *                         type: number
 *                         description: Distance from original site in km
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 * /quota/fees/calculate:
 *   post:
 *     tags: [SRSA]
 *     summary: Calculate conservation fees
 *     description: Calculate conservation fees for a dive
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [siteCode, diverCount]
 *             properties:
 *               siteCode:
 *                 type: string
 *                 example: "RS-JED-001"
 *               diverCount:
 *                 type: integer
 *                 minimum: 1
 *     responses:
 *       200:
 *         description: Fees calculated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConservationFee'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 * /quota/zones:
 *   get:
 *     tags: [SRSA]
 *     summary: Get conservation zones
 *     description: Get all conservation zones with their fee rates
 *     security: []
 *     responses:
 *       200:
 *         description: Zones retrieved
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
 *                       zone:
 *                         type: string
 *                         example: "zone_1"
 *                       name:
 *                         type: string
 *                         example: "Marine Protected Area"
 *                       feePerDiver:
 *                         type: number
 *                         example: 50
 *                       description:
 *                         type: string
 */

export {};
