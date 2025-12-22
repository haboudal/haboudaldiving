import { Router } from 'express';
import { usersController } from './users.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';

const router = Router();

// Current user routes
router.get('/me', authenticate, usersController.getMe);
router.patch('/me', authenticate, usersController.updateMe);
router.delete('/me', authenticate, usersController.deactivateMe);

// Admin routes
router.get('/:id', authenticate, authorize('admin', 'inspector'), usersController.getById);

export default router;
