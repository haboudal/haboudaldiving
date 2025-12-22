import { Router } from 'express';
import { centersController } from './centers.controller';
import { vesselsController } from './vessels/vessels.controller';
import { staffController } from './staff/staff.controller';
import { authenticate, optionalAuth } from '../../middleware/auth.middleware';

const router = Router();

// Public routes
router.get('/', optionalAuth, centersController.list);
router.get('/:id', optionalAuth, centersController.getById);

// Protected routes
router.post('/', authenticate, centersController.create);
router.patch('/:id', authenticate, centersController.update);
router.delete('/:id', authenticate, centersController.delete);

// Vessels sub-routes
router.get('/:centerId/vessels', optionalAuth, vesselsController.list);
router.get('/:centerId/vessels/:vesselId', optionalAuth, vesselsController.getById);
router.post('/:centerId/vessels', authenticate, vesselsController.create);
router.patch('/:centerId/vessels/:vesselId', authenticate, vesselsController.update);
router.delete('/:centerId/vessels/:vesselId', authenticate, vesselsController.delete);

// Staff sub-routes
router.get('/:centerId/staff', authenticate, staffController.list);
router.post('/:centerId/staff', authenticate, staffController.add);
router.patch('/:centerId/staff/:staffId', authenticate, staffController.update);
router.delete('/:centerId/staff/:staffId', authenticate, staffController.remove);

export default router;
