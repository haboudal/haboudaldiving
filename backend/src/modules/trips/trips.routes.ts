import { Router } from 'express';
import { tripsController } from './trips.controller';
import { bookingsController } from './bookings/bookings.controller';
import { authenticate, optionalAuth, authorize, requireAdult } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import {
  createTripSchema,
  updateTripSchema,
  tripFiltersSchema,
  addInstructorSchema,
} from './trips.validation';
import {
  createBookingSchema,
  updateBookingSchema,
  cancelBookingSchema,
  bookingFiltersSchema,
  signWaiverSchema,
} from './bookings/bookings.validation';

const router = Router();

// ============ BOOKING ROUTES (must be before parameterized routes) ============

// User's own bookings - MUST be before /:id routes
router.get('/bookings/my', authenticate, bookingsController.getMyBookings);

// Single booking operations
router.get('/bookings/:id', authenticate, bookingsController.getById);

router.patch(
  '/bookings/:id',
  authenticate,
  validate(updateBookingSchema),
  bookingsController.update
);

router.post(
  '/bookings/:id/cancel',
  authenticate,
  validate(cancelBookingSchema),
  bookingsController.cancel
);

router.post(
  '/bookings/:id/check-in',
  authenticate,
  authorize('center_owner', 'center_staff'),
  bookingsController.checkIn
);

router.post(
  '/bookings/:id/waiver',
  authenticate,
  validate(signWaiverSchema),
  bookingsController.signWaiver
);

// ============ TRIP ROUTES ============

// Public routes
router.get('/', optionalAuth, validate(tripFiltersSchema, 'query'), tripsController.list);
router.get('/:id', optionalAuth, tripsController.getById);

// Protected trip management routes (center owner/admin)
router.post(
  '/center/:centerId',
  authenticate,
  authorize('center_owner'),
  requireAdult,
  validate(createTripSchema),
  tripsController.create
);

router.patch(
  '/:id',
  authenticate,
  authorize('center_owner', 'center_staff'),
  validate(updateTripSchema),
  tripsController.update
);

router.delete(
  '/:id',
  authenticate,
  authorize('center_owner'),
  tripsController.delete
);

router.post(
  '/:id/cancel',
  authenticate,
  authorize('center_owner'),
  tripsController.cancel
);

router.post(
  '/:id/publish',
  authenticate,
  authorize('center_owner'),
  tripsController.publish
);

// ============ INSTRUCTOR ROUTES ============

router.get('/:id/instructors', optionalAuth, tripsController.listInstructors);

router.post(
  '/:id/instructors',
  authenticate,
  authorize('center_owner', 'center_staff'),
  validate(addInstructorSchema),
  tripsController.addInstructor
);

router.delete(
  '/:id/instructors/:instructorId',
  authenticate,
  authorize('center_owner', 'center_staff'),
  tripsController.removeInstructor
);

// ============ TRIP BOOKING ROUTES ============

// Trip bookings (center staff can view all)
router.get(
  '/:tripId/bookings',
  authenticate,
  authorize('center_owner', 'center_staff'),
  validate(bookingFiltersSchema, 'query'),
  bookingsController.listByTrip
);

// Create booking (any authenticated user)
router.post(
  '/:tripId/bookings',
  authenticate,
  validate(createBookingSchema),
  bookingsController.create
);

// Check eligibility before booking
router.get(
  '/:tripId/eligibility',
  authenticate,
  bookingsController.checkEligibility
);

// Calculate price before booking
router.post(
  '/:tripId/price',
  authenticate,
  validate(createBookingSchema),
  bookingsController.calculatePrice
);

// ============ WAITING LIST ROUTES ============

router.post('/:tripId/waitlist', authenticate, bookingsController.joinWaitingList);

router.delete('/:tripId/waitlist', authenticate, bookingsController.leaveWaitingList);

router.get(
  '/:tripId/waitlist',
  authenticate,
  authorize('center_owner', 'center_staff'),
  bookingsController.getWaitingList
);

export default router;
