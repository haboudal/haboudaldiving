import { Request, Response } from 'express';
import { adminService } from './admin.service';
import { asyncHandler, paginate } from '../../utils/helpers';
import {
  VerifyCenterDto,
  VerifyCertificationDto,
  AdminUpdateUserDto,
  DeactivateUserDto,
  ModerateReviewDto,
  UpdateSiteDto,
  CenterFilters,
  CertificationFilters,
  UserFilters,
  ReviewFilters,
  SiteFilters,
  AuditLogFilters,
} from './admin.types';

export class AdminController {
  // ============================================================================
  // DASHBOARD
  // ============================================================================

  /**
   * GET /admin/dashboard
   * Get dashboard statistics
   */
  getDashboard = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const stats = await adminService.getDashboardStats();

    res.json({
      success: true,
      data: stats,
    });
  });

  // ============================================================================
  // CENTER VERIFICATION
  // ============================================================================

  /**
   * GET /admin/centers/pending
   * List centers pending verification
   */
  listPendingCenters = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const filters: CenterFilters = {
      status: (req.query.status as CenterFilters['status']) || 'pending',
      search: req.query.search as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    };

    const { centers, total } = await adminService.getPendingCenters(filters);

    res.json({
      success: true,
      ...paginate(centers, total, { page: filters.page, limit: filters.limit }),
    });
  });

  /**
   * POST /admin/centers/:id/verify
   * Verify or reject a center
   */
  verifyCenter = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as VerifyCenterDto;
    const center = await adminService.verifyCenter(req.params.id, req.user!.userId, dto);

    res.json({
      success: true,
      message: `Center ${dto.status === 'verified' ? 'approved' : 'rejected'} successfully`,
      data: center,
    });
  });

  // ============================================================================
  // CERTIFICATION VERIFICATION
  // ============================================================================

  /**
   * GET /admin/certifications/pending
   * List certifications pending verification
   */
  listPendingCertifications = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const filters: CertificationFilters = {
      status: (req.query.status as CertificationFilters['status']) || 'pending',
      agency: req.query.agency as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    };

    const { certifications, total } = await adminService.getPendingCertifications(filters);

    res.json({
      success: true,
      ...paginate(certifications, total, { page: filters.page, limit: filters.limit }),
    });
  });

  /**
   * POST /admin/certifications/:id/verify
   * Verify or reject a certification
   */
  verifyCertification = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as VerifyCertificationDto;
    const certification = await adminService.verifyCertification(req.params.id, req.user!.userId, dto);

    res.json({
      success: true,
      message: `Certification ${dto.status === 'verified' ? 'approved' : 'rejected'} successfully`,
      data: certification,
    });
  });

  // ============================================================================
  // USER MANAGEMENT
  // ============================================================================

  /**
   * GET /admin/users
   * List all users with filters
   */
  listUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const filters: UserFilters = {
      role: req.query.role as UserFilters['role'],
      status: req.query.status as UserFilters['status'],
      search: req.query.search as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    };

    const { users, total } = await adminService.listUsers(filters);

    res.json({
      success: true,
      ...paginate(users, total, { page: filters.page, limit: filters.limit }),
    });
  });

  /**
   * GET /admin/users/:id
   * Get user details
   */
  getUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = await adminService.getUserDetails(req.params.id);

    res.json({
      success: true,
      data: user,
    });
  });

  /**
   * PATCH /admin/users/:id
   * Update user role or status
   */
  updateUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as AdminUpdateUserDto;
    const user = await adminService.updateUser(req.params.id, req.user!.userId, dto);

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user,
    });
  });

  /**
   * POST /admin/users/:id/deactivate
   * Deactivate a user account
   */
  deactivateUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as DeactivateUserDto;
    await adminService.deactivateUser(req.params.id, req.user!.userId, dto);

    res.json({
      success: true,
      message: 'User deactivated successfully',
    });
  });

  // ============================================================================
  // REVIEW MODERATION
  // ============================================================================

  /**
   * GET /admin/reviews/flagged
   * List flagged reviews
   */
  listFlaggedReviews = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const filters: ReviewFilters = {
      status: req.query.status as string,
      minReports: parseInt(req.query.minReports as string) || 1,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    };

    const { reviews, total } = await adminService.getFlaggedReviews(filters);

    res.json({
      success: true,
      ...paginate(reviews, total, { page: filters.page, limit: filters.limit }),
    });
  });

  /**
   * POST /admin/reviews/:id/moderate
   * Moderate a review (approve, hide, remove)
   */
  moderateReview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as ModerateReviewDto;
    const review = await adminService.moderateReview(req.params.id, req.user!.userId, dto);

    res.json({
      success: true,
      message: `Review ${dto.action}d successfully`,
      data: review,
    });
  });

  // ============================================================================
  // SITE MANAGEMENT
  // ============================================================================

  /**
   * GET /admin/sites
   * List dive sites
   */
  listSites = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const filters: SiteFilters = {
      regionId: req.query.regionId as string,
      isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
      search: req.query.search as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    };

    const { sites, total } = await adminService.listSites(filters);

    res.json({
      success: true,
      ...paginate(sites, total, { page: filters.page, limit: filters.limit }),
    });
  });

  /**
   * PATCH /admin/sites/:id
   * Update site details
   */
  updateSite = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as UpdateSiteDto;
    const site = await adminService.updateSite(req.params.id, req.user!.userId, dto);

    res.json({
      success: true,
      message: 'Site updated successfully',
      data: site,
    });
  });

  /**
   * POST /admin/sites/:id/toggle
   * Toggle site active status
   */
  toggleSiteStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { isActive, reason } = req.body as { isActive: boolean; reason?: string };
    const site = await adminService.toggleSiteStatus(req.params.id, req.user!.userId, isActive, reason);

    res.json({
      success: true,
      message: `Site ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: site,
    });
  });

  // ============================================================================
  // AUDIT LOGS
  // ============================================================================

  /**
   * GET /admin/audit-logs
   * Query audit logs
   */
  listAuditLogs = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const filters: AuditLogFilters = {
      userId: req.query.userId as string,
      action: req.query.action as string,
      entityType: req.query.entityType as string,
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    };

    const { logs, total } = await adminService.getAuditLogs(filters);

    res.json({
      success: true,
      ...paginate(logs, total, { page: filters.page, limit: filters.limit }),
    });
  });
}

export const adminController = new AdminController();
