import { Router } from 'express';
import { diveLogsController } from './dive-logs.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Dive Logs
 *   description: Dive log management and tracking
 */

// All routes require authentication
router.use(authenticate);

// ============================================================================
// USER DIVE LOGS
// ============================================================================

/**
 * @swagger
 * /dive-logs:
 *   get:
 *     summary: Get my dive logs
 *     tags: [Dive Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *       - in: query
 *         name: siteId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: diveType
 *         schema:
 *           type: string
 *           enum: [recreational, training, night, deep, drift, wreck, cave, photography, other]
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: minDepth
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxDepth
 *         schema:
 *           type: number
 *       - in: query
 *         name: verified
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [date, depth, duration, created]
 *           default: date
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: List of dive logs
 *       401:
 *         description: Unauthorized
 */
router.get('/', diveLogsController.getMyDiveLogs.bind(diveLogsController));

/**
 * @swagger
 * /dive-logs/statistics:
 *   get:
 *     summary: Get my dive statistics
 *     tags: [Dive Logs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dive statistics including totals, averages, and distributions
 *       401:
 *         description: Unauthorized
 */
router.get('/statistics', diveLogsController.getMyStatistics.bind(diveLogsController));

/**
 * @swagger
 * /dive-logs/import:
 *   post:
 *     summary: Import dives from dive computer
 *     tags: [Dive Logs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - computerBrand
 *               - dives
 *             properties:
 *               computerBrand:
 *                 type: string
 *                 description: Brand of dive computer (e.g., Suunto, Shearwater, Garmin)
 *               computerModel:
 *                 type: string
 *               dives:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - diveDate
 *                     - bottomTimeMinutes
 *                     - maxDepthMeters
 *                   properties:
 *                     diveDate:
 *                       type: string
 *                       format: date
 *                     entryTime:
 *                       type: string
 *                       format: time
 *                     exitTime:
 *                       type: string
 *                       format: time
 *                     bottomTimeMinutes:
 *                       type: integer
 *                     maxDepthMeters:
 *                       type: number
 *                     avgDepthMeters:
 *                       type: number
 *                     waterTempC:
 *                       type: integer
 *                     startPressureBar:
 *                       type: integer
 *                     endPressureBar:
 *                       type: integer
 *                     gasMixture:
 *                       type: string
 *                       enum: [air, nitrox_32, nitrox_36, trimix, other]
 *                     rawData:
 *                       type: object
 *     responses:
 *       201:
 *         description: Dives imported successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/import', diveLogsController.importFromComputer.bind(diveLogsController));

/**
 * @swagger
 * /dive-logs/trip/{tripId}:
 *   get:
 *     summary: Get dive logs for a specific trip
 *     tags: [Dive Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Dive logs for the trip
 *       401:
 *         description: Unauthorized
 */
router.get('/trip/:tripId', diveLogsController.getDivesForTrip.bind(diveLogsController));

/**
 * @swagger
 * /dive-logs/{id}:
 *   get:
 *     summary: Get a single dive log
 *     tags: [Dive Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Dive log details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not your dive log
 *       404:
 *         description: Dive log not found
 */
router.get('/:id', diveLogsController.getDiveLog.bind(diveLogsController));

/**
 * @swagger
 * /dive-logs:
 *   post:
 *     summary: Create a new dive log
 *     tags: [Dive Logs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - diveDate
 *             properties:
 *               tripId:
 *                 type: string
 *                 format: uuid
 *               bookingId:
 *                 type: string
 *                 format: uuid
 *               siteId:
 *                 type: string
 *                 format: uuid
 *               diveNumber:
 *                 type: integer
 *                 description: Auto-assigned if not provided
 *               diveDate:
 *                 type: string
 *                 format: date
 *               entryTime:
 *                 type: string
 *                 format: time
 *               exitTime:
 *                 type: string
 *                 format: time
 *               bottomTimeMinutes:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 600
 *               maxDepthMeters:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 350
 *               avgDepthMeters:
 *                 type: number
 *               waterTempC:
 *                 type: integer
 *               visibilityMeters:
 *                 type: integer
 *               weightKg:
 *                 type: number
 *               suitType:
 *                 type: string
 *                 enum: [none, shorty, wetsuit_3mm, wetsuit_5mm, wetsuit_7mm, semi_dry, dry_suit]
 *               tankType:
 *                 type: string
 *                 enum: [aluminum_80, aluminum_63, steel_80, steel_100, steel_120, twinset, sidemount]
 *               tankSizeLiters:
 *                 type: integer
 *               startPressureBar:
 *                 type: integer
 *               endPressureBar:
 *                 type: integer
 *               gasMixture:
 *                 type: string
 *                 enum: [air, nitrox_32, nitrox_36, trimix, other]
 *                 default: air
 *               diveType:
 *                 type: string
 *                 enum: [recreational, training, night, deep, drift, wreck, cave, photography, other]
 *               entryType:
 *                 type: string
 *                 enum: [shore, boat, pier, platform]
 *               currentConditions:
 *                 type: string
 *                 enum: [none, light, moderate, strong, variable]
 *               weatherConditions:
 *                 type: string
 *                 enum: [sunny, cloudy, overcast, rainy, windy, stormy]
 *               buddyName:
 *                 type: string
 *                 maxLength: 200
 *               buddyUserId:
 *                 type: string
 *                 format: uuid
 *               instructorId:
 *                 type: string
 *                 format: uuid
 *               notes:
 *                 type: string
 *                 maxLength: 2000
 *               marineLifeSpotted:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 20
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *                 maxItems: 10
 *               computerData:
 *                 type: object
 *               isTrainingDive:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Dive log created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', diveLogsController.createDiveLog.bind(diveLogsController));

/**
 * @swagger
 * /dive-logs/{id}:
 *   patch:
 *     summary: Update a dive log
 *     tags: [Dive Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *             description: Same fields as create, all optional
 *     responses:
 *       200:
 *         description: Dive log updated
 *       400:
 *         description: Cannot modify verified dive log
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not your dive log
 *       404:
 *         description: Dive log not found
 */
router.patch('/:id', diveLogsController.updateDiveLog.bind(diveLogsController));

/**
 * @swagger
 * /dive-logs/{id}:
 *   delete:
 *     summary: Delete a dive log
 *     tags: [Dive Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Dive log deleted
 *       400:
 *         description: Cannot delete verified dive log
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not your dive log
 *       404:
 *         description: Dive log not found
 */
router.delete('/:id', diveLogsController.deleteDiveLog.bind(diveLogsController));

// ============================================================================
// INSTRUCTOR ROUTES
// ============================================================================

/**
 * @swagger
 * /dive-logs/{id}/verify:
 *   post:
 *     summary: Verify a dive log (instructor only)
 *     tags: [Dive Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               signatureUrl:
 *                 type: string
 *                 format: uri
 *                 description: URL to instructor's digital signature
 *     responses:
 *       200:
 *         description: Dive log verified
 *       400:
 *         description: Already verified
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: You are not the assigned instructor
 *       404:
 *         description: Dive log not found
 */
router.post(
  '/:id/verify',
  authorize('instructor'),
  diveLogsController.verifyDiveLog.bind(diveLogsController)
);

export default router;
