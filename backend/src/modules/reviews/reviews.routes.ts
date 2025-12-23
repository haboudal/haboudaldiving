import { Router } from 'express';
import { reviewsController } from './reviews.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: Review management for diving centers and instructors
 */

// ============================================================================
// PUBLIC ROUTES (Read reviews without auth)
// ============================================================================

/**
 * @swagger
 * /reviews/centers/{centerId}:
 *   get:
 *     summary: Get reviews for a diving center
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: centerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 50
 *       - in: query
 *         name: rating
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *       - in: query
 *         name: verifiedOnly
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest, highest, lowest, helpful]
 *           default: newest
 *     responses:
 *       200:
 *         description: Reviews with statistics
 */
router.get('/centers/:centerId', reviewsController.getCenterReviews.bind(reviewsController));

/**
 * @swagger
 * /reviews/instructors/{instructorId}:
 *   get:
 *     summary: Get reviews for an instructor
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: instructorId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: rating
 *         schema:
 *           type: integer
 *       - in: query
 *         name: verifiedOnly
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest, highest, lowest, helpful]
 *     responses:
 *       200:
 *         description: Reviews with statistics
 */
router.get('/instructors/:instructorId', reviewsController.getInstructorReviews.bind(reviewsController));

/**
 * @swagger
 * /reviews/{id}:
 *   get:
 *     summary: Get a single review by ID
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Review details
 *       404:
 *         description: Review not found
 */
router.get('/:id', reviewsController.getReview.bind(reviewsController));

// ============================================================================
// AUTHENTICATED ROUTES
// ============================================================================

/**
 * @swagger
 * /reviews/my:
 *   get:
 *     summary: Get current user's reviews
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User's reviews
 *       401:
 *         description: Unauthorized
 */
router.get('/my/list', authenticate, reviewsController.getMyReviews.bind(reviewsController));

/**
 * @swagger
 * /reviews/my/pending:
 *   get:
 *     summary: Get bookings available for review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of bookings that can be reviewed
 *       401:
 *         description: Unauthorized
 */
router.get('/my/pending', authenticate, reviewsController.getPendingReviews.bind(reviewsController));

/**
 * @swagger
 * /reviews:
 *   post:
 *     summary: Create a new review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingId
 *               - reviewableType
 *               - reviewableId
 *               - rating
 *             properties:
 *               bookingId:
 *                 type: string
 *                 format: uuid
 *               reviewableType:
 *                 type: string
 *                 enum: [center, instructor]
 *               reviewableId:
 *                 type: string
 *                 format: uuid
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               title:
 *                 type: string
 *                 maxLength: 200
 *               content:
 *                 type: string
 *                 maxLength: 2000
 *               pros:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 5
 *               cons:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 5
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *                 maxItems: 5
 *     responses:
 *       201:
 *         description: Review created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticate, reviewsController.createReview.bind(reviewsController));

/**
 * @swagger
 * /reviews/{id}:
 *   patch:
 *     summary: Update own review
 *     tags: [Reviews]
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
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               pros:
 *                 type: array
 *                 items:
 *                   type: string
 *               cons:
 *                 type: array
 *                 items:
 *                   type: string
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Review updated
 *       400:
 *         description: Cannot edit after 7 days
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not your review
 *       404:
 *         description: Review not found
 */
router.patch('/:id', authenticate, reviewsController.updateReview.bind(reviewsController));

/**
 * @swagger
 * /reviews/{id}:
 *   delete:
 *     summary: Delete own review
 *     tags: [Reviews]
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
 *         description: Review deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not your review
 *       404:
 *         description: Review not found
 */
router.delete('/:id', authenticate, reviewsController.deleteReview.bind(reviewsController));

/**
 * @swagger
 * /reviews/{id}/helpful:
 *   post:
 *     summary: Mark a review as helpful
 *     tags: [Reviews]
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
 *         description: Review marked as helpful
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Review not found
 */
router.post('/:id/helpful', authenticate, reviewsController.markHelpful.bind(reviewsController));

/**
 * @swagger
 * /reviews/{id}/report:
 *   post:
 *     summary: Report a review for moderation
 *     tags: [Reviews]
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
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Review reported
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Review not found
 */
router.post('/:id/report', authenticate, reviewsController.reportReview.bind(reviewsController));

// ============================================================================
// CENTER OWNER/STAFF ROUTES
// ============================================================================

/**
 * @swagger
 * /reviews/centers/{centerId}/reviews/{reviewId}/respond:
 *   post:
 *     summary: Respond to a review (center owner/staff only)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: centerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: reviewId
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
 *             required:
 *               - response
 *             properties:
 *               response:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 1000
 *     responses:
 *       200:
 *         description: Response added
 *       400:
 *         description: Review already has a response
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not authorized for this center
 *       404:
 *         description: Review not found
 */
router.post(
  '/centers/:centerId/reviews/:reviewId/respond',
  authenticate,
  authorize('center_owner', 'center_staff'),
  reviewsController.respondToReview.bind(reviewsController)
);

export default router;
