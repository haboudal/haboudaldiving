import { Router } from 'express';
import { diversController } from './divers.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.get('/:id/profile', authenticate, diversController.getProfile);
router.patch('/:id/profile', authenticate, diversController.updateProfile);
router.get('/:id/certifications', authenticate, diversController.getCertifications);
router.post('/:id/certifications', authenticate, diversController.addCertification);
router.delete('/:id/certifications/:certId', authenticate, diversController.deleteCertification);
router.get('/:id/medical-status', authenticate, diversController.getMedicalStatus);

export default router;
