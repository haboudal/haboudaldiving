import { Router } from 'express';
import { guardiansController } from './guardians.controller';
import { authenticate, authorize, requireAdult } from '../../middleware/auth.middleware';

const router = Router();

// All routes require authentication and adult status
router.use(authenticate);
router.use(requireAdult);
router.use(authorize('parent', 'admin'));

router.get('/minors', guardiansController.getMinors);
router.post('/link-minor', guardiansController.linkMinor);
router.post('/consent/:minorId', guardiansController.giveConsent);
router.delete('/consent/:minorId', guardiansController.revokeConsent);
router.get('/pending-approvals', guardiansController.getPendingApprovals);
router.post('/approve-booking/:bookingId', guardiansController.approveBooking);

export default router;
