import { Router } from 'express';
import { instructorsController } from './instructors.controller';
import { authenticate, optionalAuth } from '../../middleware/auth.middleware';

const router = Router();

router.get('/', optionalAuth, instructorsController.list);
router.get('/:id', optionalAuth, instructorsController.getById);
router.patch('/:id', authenticate, instructorsController.update);
router.get('/:id/schedule', optionalAuth, instructorsController.getSchedule);
router.patch('/:id/schedule', authenticate, instructorsController.updateSchedule);

export default router;
