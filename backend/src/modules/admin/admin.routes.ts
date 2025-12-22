import { Router } from 'express';
import { adminController } from './admin.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import {
  uuidParamSchema,
  verifyCenterSchema,
  verifyCertificationSchema,
  adminUpdateUserSchema,
  deactivateUserSchema,
  moderateReviewSchema,
  updateSiteSchema,
  toggleSiteStatusSchema,
  centerFiltersSchema,
  certificationFiltersSchema,
  userFiltersSchema,
  reviewFiltersSchema,
  siteFiltersSchema,
  auditLogFiltersSchema,
} from './admin.validation';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// ============================================================================
// DASHBOARD
// ============================================================================

router.get('/dashboard', adminController.getDashboard);

// ============================================================================
// CENTER VERIFICATION
// ============================================================================

router.get(
  '/centers/pending',
  validate(centerFiltersSchema, 'query'),
  adminController.listPendingCenters
);

router.post(
  '/centers/:id/verify',
  validate(uuidParamSchema, 'params'),
  validate(verifyCenterSchema),
  adminController.verifyCenter
);

// ============================================================================
// CERTIFICATION VERIFICATION
// ============================================================================

router.get(
  '/certifications/pending',
  validate(certificationFiltersSchema, 'query'),
  adminController.listPendingCertifications
);

router.post(
  '/certifications/:id/verify',
  validate(uuidParamSchema, 'params'),
  validate(verifyCertificationSchema),
  adminController.verifyCertification
);

// ============================================================================
// USER MANAGEMENT
// ============================================================================

router.get(
  '/users',
  validate(userFiltersSchema, 'query'),
  adminController.listUsers
);

router.get(
  '/users/:id',
  validate(uuidParamSchema, 'params'),
  adminController.getUser
);

router.patch(
  '/users/:id',
  validate(uuidParamSchema, 'params'),
  validate(adminUpdateUserSchema),
  adminController.updateUser
);

router.post(
  '/users/:id/deactivate',
  validate(uuidParamSchema, 'params'),
  validate(deactivateUserSchema),
  adminController.deactivateUser
);

// ============================================================================
// REVIEW MODERATION
// ============================================================================

router.get(
  '/reviews/flagged',
  validate(reviewFiltersSchema, 'query'),
  adminController.listFlaggedReviews
);

router.post(
  '/reviews/:id/moderate',
  validate(uuidParamSchema, 'params'),
  validate(moderateReviewSchema),
  adminController.moderateReview
);

// ============================================================================
// SITE MANAGEMENT
// ============================================================================

router.get(
  '/sites',
  validate(siteFiltersSchema, 'query'),
  adminController.listSites
);

router.patch(
  '/sites/:id',
  validate(uuidParamSchema, 'params'),
  validate(updateSiteSchema),
  adminController.updateSite
);

router.post(
  '/sites/:id/toggle',
  validate(uuidParamSchema, 'params'),
  validate(toggleSiteStatusSchema),
  adminController.toggleSiteStatus
);

// ============================================================================
// AUDIT LOGS
// ============================================================================

router.get(
  '/audit-logs',
  validate(auditLogFiltersSchema, 'query'),
  adminController.listAuditLogs
);

export default router;
