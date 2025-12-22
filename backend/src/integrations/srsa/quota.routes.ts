import { Router } from 'express';
import { quotaController } from './quota.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';

const router = Router();

// All quota routes require authentication
router.use(authenticate);

// Quota checking - any authenticated user
router.post('/check', quotaController.checkQuota);
router.get('/forecast/:siteCode', quotaController.getForecast);
router.get('/alternatives', quotaController.getAlternatives);
router.post('/fees/calculate', quotaController.calculateFees);

// Reservation management - center owners/staff only
router.post('/reserve', authorize('center_owner', 'center_staff', 'admin'), quotaController.reserveQuota);
router.delete('/reserve/:permitNumber', authorize('center_owner', 'center_staff', 'admin'), quotaController.cancelReservation);

export default router;
