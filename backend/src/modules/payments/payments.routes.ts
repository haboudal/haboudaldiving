import { Router } from 'express';
import { paymentsController } from './payments.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import {
  initiateCheckoutSchema,
  refundSchema,
  paymentListQuerySchema,
  uuidParamSchema,
  bookingIdParamSchema,
} from './payments.validation';

const router = Router();

// Public webhook endpoint (no auth, verified by signature)
router.post('/webhook', paymentsController.handleWebhook);

// All other routes require authentication
router.use(authenticate);

// User payment endpoints
router.post('/checkout', validate(initiateCheckoutSchema), paymentsController.initiateCheckout);

router.get('/my', paymentsController.getMyPayments);

router.get('/status/:checkoutId', paymentsController.getPaymentStatus);

router.get(
  '/booking/:bookingId',
  validate(bookingIdParamSchema, 'params'),
  paymentsController.getByBooking
);

router.get('/:id', validate(uuidParamSchema, 'params'), paymentsController.getById);

// Refund (admin or center owner - verified in service)
router.post(
  '/:id/refund',
  validate(uuidParamSchema, 'params'),
  validate(refundSchema),
  paymentsController.processRefund
);

// Admin-only endpoints
router.get(
  '/',
  authorize('admin'),
  validate(paymentListQuerySchema, 'query'),
  paymentsController.listPayments
);

export default router;
