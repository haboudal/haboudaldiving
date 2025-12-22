import { db } from '../../config/database';
import { NotFoundError, ValidationError } from '../../utils/errors';
import {
  DashboardStats,
  CenterWithVerification,
  CertificationWithUser,
  UserWithDetails,
  ReviewWithDetails,
  DiveSiteAdmin,
  AuditLogEntry,
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

export class AdminService {
  // ============================================================================
  // DASHBOARD
  // ============================================================================

  async getDashboardStats(): Promise<DashboardStats> {
    // Execute all counts in parallel
    const [
      usersResult,
      centersResult,
      certsResult,
      tripsResult,
      bookingsResult,
      reviewsResult,
    ] = await Promise.all([
      // Users stats
      db.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE role = 'diver') as divers,
          COUNT(*) FILTER (WHERE role = 'instructor') as instructors,
          COUNT(*) FILTER (WHERE role = 'center_owner') as center_owners,
          COUNT(*) FILTER (WHERE status = 'pending_verification') as pending_verification,
          COUNT(*) FILTER (WHERE last_login_at > NOW() - INTERVAL '24 hours') as active_today
        FROM users
      `),
      // Centers stats
      db.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE license_status = 'verified') as verified,
          COUNT(*) FILTER (WHERE license_status = 'pending') as pending,
          COUNT(*) FILTER (WHERE license_status = 'rejected') as rejected
        FROM diving_centers
      `),
      // Certifications stats
      db.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE verification_status = 'pending') as pending,
          COUNT(*) FILTER (WHERE verification_status = 'verified') as verified
        FROM certifications
      `),
      // Trips stats
      db.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'published' AND departure_date > NOW()) as upcoming,
          COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
          COUNT(*) FILTER (WHERE status = 'completed' AND departure_date > DATE_TRUNC('month', NOW())) as completed_this_month
        FROM trips
      `),
      // Bookings stats
      db.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE created_at > DATE_TRUNC('month', NOW())) as this_month,
          COALESCE(SUM(total_price) FILTER (WHERE status IN ('paid', 'completed') AND created_at > DATE_TRUNC('month', NOW())), 0) as revenue
        FROM trip_bookings
      `),
      // Reviews stats
      db.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE reported_count > 0) as flagged,
          COALESCE(AVG(rating), 0) as average_rating
        FROM reviews
      `),
    ]);

    const users = usersResult.rows[0];
    const centers = centersResult.rows[0];
    const certs = certsResult.rows[0];
    const trips = tripsResult.rows[0];
    const bookings = bookingsResult.rows[0];
    const reviews = reviewsResult.rows[0];

    return {
      users: {
        total: parseInt(users.total, 10),
        divers: parseInt(users.divers, 10),
        instructors: parseInt(users.instructors, 10),
        centerOwners: parseInt(users.center_owners, 10),
        pendingVerification: parseInt(users.pending_verification, 10),
        activeToday: parseInt(users.active_today, 10),
      },
      centers: {
        total: parseInt(centers.total, 10),
        verified: parseInt(centers.verified, 10),
        pending: parseInt(centers.pending, 10),
        rejected: parseInt(centers.rejected, 10),
      },
      certifications: {
        total: parseInt(certs.total, 10),
        pending: parseInt(certs.pending, 10),
        verified: parseInt(certs.verified, 10),
      },
      trips: {
        total: parseInt(trips.total, 10),
        upcoming: parseInt(trips.upcoming, 10),
        inProgress: parseInt(trips.in_progress, 10),
        completedThisMonth: parseInt(trips.completed_this_month, 10),
      },
      bookings: {
        total: parseInt(bookings.total, 10),
        thisMonth: parseInt(bookings.this_month, 10),
        revenue: parseFloat(bookings.revenue) || 0,
      },
      reviews: {
        total: parseInt(reviews.total, 10),
        flagged: parseInt(reviews.flagged, 10),
        averageRating: parseFloat(reviews.average_rating) || 0,
      },
    };
  }

  // ============================================================================
  // CENTER VERIFICATION
  // ============================================================================

  async getPendingCenters(filters: CenterFilters): Promise<{ centers: CenterWithVerification[]; total: number }> {
    const { page = 1, limit = 20, status = 'pending', search } = filters;
    const offset = (page - 1) * limit;
    const params: unknown[] = [];
    let paramIndex = 1;

    let whereClause = `WHERE dc.license_status = $${paramIndex++}`;
    params.push(status);

    if (search) {
      whereClause += ` AND (dc.name_en ILIKE $${paramIndex} OR dc.name_ar ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countResult = await db.query<{ count: string }>(
      `SELECT COUNT(*) FROM diving_centers dc JOIN users u ON dc.owner_user_id = u.id ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const result = await db.query(
      `SELECT
        dc.id, dc.name_en, dc.name_ar, dc.owner_user_id, u.email as owner_email,
        dc.srsa_license_number, dc.license_expiry_date, dc.license_status,
        dc.commercial_registration, dc.vat_number, dc.city, dc.email, dc.phone_primary,
        dc.created_at,
        (SELECT COUNT(*) FROM center_documents cd WHERE cd.center_id = dc.id) as documents_count
       FROM diving_centers dc
       JOIN users u ON dc.owner_user_id = u.id
       ${whereClause}
       ORDER BY dc.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params
    );

    return {
      centers: result.rows.map(this.mapToCenterWithVerification),
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  async verifyCenter(centerId: string, adminId: string, dto: VerifyCenterDto): Promise<CenterWithVerification> {
    const center = await db.query('SELECT * FROM diving_centers WHERE id = $1', [centerId]);
    if (center.rows.length === 0) {
      throw new NotFoundError('Diving center');
    }

    await db.query(
      `UPDATE diving_centers
       SET license_status = $1, verified_by = $2, verified_at = NOW(), updated_at = NOW()
       WHERE id = $3`,
      [dto.status, adminId, centerId]
    );

    // Log audit
    await this.logAction(adminId, 'verify_center', 'diving_center', centerId, {
      status: dto.status,
      notes: dto.notes,
      previousStatus: center.rows[0].license_status,
    });

    // Fetch and return updated center
    const result = await db.query(
      `SELECT
        dc.id, dc.name_en, dc.name_ar, dc.owner_user_id, u.email as owner_email,
        dc.srsa_license_number, dc.license_expiry_date, dc.license_status,
        dc.commercial_registration, dc.vat_number, dc.city, dc.email, dc.phone_primary,
        dc.created_at,
        (SELECT COUNT(*) FROM center_documents cd WHERE cd.center_id = dc.id) as documents_count
       FROM diving_centers dc
       JOIN users u ON dc.owner_user_id = u.id
       WHERE dc.id = $1`,
      [centerId]
    );

    return this.mapToCenterWithVerification(result.rows[0]);
  }

  // ============================================================================
  // CERTIFICATION VERIFICATION
  // ============================================================================

  async getPendingCertifications(filters: CertificationFilters): Promise<{ certifications: CertificationWithUser[]; total: number }> {
    const { page = 1, limit = 20, status = 'pending', agency } = filters;
    const offset = (page - 1) * limit;
    const params: unknown[] = [];
    let paramIndex = 1;

    let whereClause = `WHERE c.verification_status = $${paramIndex++}`;
    params.push(status);

    if (agency) {
      whereClause += ` AND c.agency ILIKE $${paramIndex++}`;
      params.push(`%${agency}%`);
    }

    const countResult = await db.query<{ count: string }>(
      `SELECT COUNT(*) FROM certifications c JOIN users u ON c.user_id = u.id ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const result = await db.query(
      `SELECT
        c.id, c.user_id, u.email as user_email,
        COALESCE(dp.first_name_en, '') || ' ' || COALESCE(dp.last_name_en, '') as user_name,
        c.agency, c.certification_type, c.certification_number, c.certification_level,
        c.issue_date, c.expiry_date, c.verification_status, c.document_url, c.created_at
       FROM certifications c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN diver_profiles dp ON dp.user_id = u.id
       ${whereClause}
       ORDER BY c.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params
    );

    return {
      certifications: result.rows.map(this.mapToCertificationWithUser),
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  async verifyCertification(certId: string, adminId: string, dto: VerifyCertificationDto): Promise<CertificationWithUser> {
    const cert = await db.query('SELECT * FROM certifications WHERE id = $1', [certId]);
    if (cert.rows.length === 0) {
      throw new NotFoundError('Certification');
    }

    await db.query(
      `UPDATE certifications
       SET verification_status = $1, verified_by = $2, verified_at = NOW(), updated_at = NOW()
       WHERE id = $3`,
      [dto.status, adminId, certId]
    );

    // Log audit
    await this.logAction(adminId, 'verify_certification', 'certification', certId, {
      status: dto.status,
      notes: dto.notes,
      previousStatus: cert.rows[0].verification_status,
    });

    // Fetch and return updated certification
    const result = await db.query(
      `SELECT
        c.id, c.user_id, u.email as user_email,
        COALESCE(dp.first_name_en, '') || ' ' || COALESCE(dp.last_name_en, '') as user_name,
        c.agency, c.certification_type, c.certification_number, c.certification_level,
        c.issue_date, c.expiry_date, c.verification_status, c.document_url, c.created_at
       FROM certifications c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN diver_profiles dp ON dp.user_id = u.id
       WHERE c.id = $1`,
      [certId]
    );

    return this.mapToCertificationWithUser(result.rows[0]);
  }

  // ============================================================================
  // USER MANAGEMENT
  // ============================================================================

  async listUsers(filters: UserFilters): Promise<{ users: UserWithDetails[]; total: number }> {
    const { page = 1, limit = 20, role, status, search } = filters;
    const offset = (page - 1) * limit;
    const params: unknown[] = [];
    let paramIndex = 1;
    const conditions: string[] = [];

    if (role) {
      conditions.push(`u.role = $${paramIndex++}`);
      params.push(role);
    }

    if (status) {
      conditions.push(`u.status = $${paramIndex++}`);
      params.push(status);
    }

    if (search) {
      conditions.push(`(u.email ILIKE $${paramIndex} OR dp.first_name_en ILIKE $${paramIndex} OR dp.last_name_en ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await db.query<{ count: string }>(
      `SELECT COUNT(*) FROM users u LEFT JOIN diver_profiles dp ON dp.user_id = u.id ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const result = await db.query(
      `SELECT
        u.id, u.email, u.phone_number, u.role, u.status, u.preferred_language,
        u.email_verified_at, u.phone_verified_at, u.last_login_at,
        u.failed_login_attempts, u.locked_until, u.created_at, u.updated_at,
        dp.first_name_en, dp.first_name_ar, dp.last_name_en, dp.last_name_ar,
        dp.date_of_birth, dp.nationality,
        (SELECT COUNT(*) FROM certifications WHERE user_id = u.id) as certifications_count,
        (SELECT COUNT(*) FROM trip_bookings WHERE diver_user_id = u.id) as bookings_count
       FROM users u
       LEFT JOIN diver_profiles dp ON dp.user_id = u.id
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params
    );

    return {
      users: result.rows.map(this.mapToUserWithDetails),
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  async getUserDetails(userId: string): Promise<UserWithDetails> {
    const result = await db.query(
      `SELECT
        u.id, u.email, u.phone_number, u.role, u.status, u.preferred_language,
        u.email_verified_at, u.phone_verified_at, u.last_login_at,
        u.failed_login_attempts, u.locked_until, u.created_at, u.updated_at,
        dp.first_name_en, dp.first_name_ar, dp.last_name_en, dp.last_name_ar,
        dp.date_of_birth, dp.nationality,
        (SELECT COUNT(*) FROM certifications WHERE user_id = u.id) as certifications_count,
        (SELECT COUNT(*) FROM trip_bookings WHERE diver_user_id = u.id) as bookings_count
       FROM users u
       LEFT JOIN diver_profiles dp ON dp.user_id = u.id
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User');
    }

    return this.mapToUserWithDetails(result.rows[0]);
  }

  async updateUser(userId: string, adminId: string, dto: AdminUpdateUserDto): Promise<UserWithDetails> {
    const currentUser = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (currentUser.rows.length === 0) {
      throw new NotFoundError('User');
    }

    // Prevent self-demotion
    if (userId === adminId && dto.role && dto.role !== 'admin') {
      throw new ValidationError('Cannot change your own admin role');
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (dto.role) {
      updates.push(`role = $${paramIndex++}`);
      values.push(dto.role);
    }

    if (dto.status) {
      updates.push(`status = $${paramIndex++}`);
      values.push(dto.status);
    }

    if (updates.length > 0) {
      values.push(userId);
      await db.query(
        `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`,
        values
      );

      // Log audit
      await this.logAction(adminId, 'update_user', 'user', userId, {
        changes: dto,
        previousRole: currentUser.rows[0].role,
        previousStatus: currentUser.rows[0].status,
        notes: dto.notes,
      });
    }

    return this.getUserDetails(userId);
  }

  async deactivateUser(userId: string, adminId: string, dto: DeactivateUserDto): Promise<void> {
    const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (user.rows.length === 0) {
      throw new NotFoundError('User');
    }

    // Prevent self-deactivation
    if (userId === adminId) {
      throw new ValidationError('Cannot deactivate your own account');
    }

    await db.query(
      "UPDATE users SET status = 'deactivated', updated_at = NOW() WHERE id = $1",
      [userId]
    );

    // Log audit
    await this.logAction(adminId, 'deactivate_user', 'user', userId, {
      reason: dto.reason,
      previousStatus: user.rows[0].status,
    });
  }

  // ============================================================================
  // REVIEW MODERATION
  // ============================================================================

  async getFlaggedReviews(filters: ReviewFilters): Promise<{ reviews: ReviewWithDetails[]; total: number }> {
    const { page = 1, limit = 20, minReports = 1 } = filters;
    const offset = (page - 1) * limit;

    const countResult = await db.query<{ count: string }>(
      'SELECT COUNT(*) FROM reviews WHERE reported_count >= $1',
      [minReports]
    );

    const result = await db.query(
      `SELECT
        r.id, r.user_id, u.email as user_email,
        COALESCE(dp.first_name_en, '') || ' ' || COALESCE(dp.last_name_en, '') as user_name,
        r.booking_id, r.reviewable_type, r.reviewable_id,
        CASE
          WHEN r.reviewable_type = 'center' THEN (SELECT name_en FROM diving_centers WHERE id = r.reviewable_id)
          WHEN r.reviewable_type = 'site' THEN (SELECT name_en FROM dive_sites WHERE id = r.reviewable_id)
          ELSE 'Unknown'
        END as reviewable_name,
        r.rating, r.title, r.content, r.is_verified_booking,
        r.helpful_count, r.reported_count, r.status,
        r.moderated_at, r.moderated_by, r.created_at
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       LEFT JOIN diver_profiles dp ON dp.user_id = u.id
       WHERE r.reported_count >= $1
       ORDER BY r.reported_count DESC, r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [minReports, limit, offset]
    );

    return {
      reviews: result.rows.map(this.mapToReviewWithDetails),
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  async moderateReview(reviewId: string, adminId: string, dto: ModerateReviewDto): Promise<ReviewWithDetails> {
    const review = await db.query('SELECT * FROM reviews WHERE id = $1', [reviewId]);
    if (review.rows.length === 0) {
      throw new NotFoundError('Review');
    }

    let newStatus: string;
    switch (dto.action) {
      case 'approve':
        newStatus = 'published';
        break;
      case 'hide':
        newStatus = 'hidden';
        break;
      case 'remove':
        newStatus = 'removed';
        break;
    }

    await db.query(
      `UPDATE reviews
       SET status = $1, moderated_at = NOW(), moderated_by = $2, reported_count = 0, updated_at = NOW()
       WHERE id = $3`,
      [newStatus, adminId, reviewId]
    );

    // Log audit
    await this.logAction(adminId, 'moderate_review', 'review', reviewId, {
      action: dto.action,
      reason: dto.reason,
      previousStatus: review.rows[0].status,
    });

    // Fetch and return updated review
    const result = await db.query(
      `SELECT
        r.id, r.user_id, u.email as user_email,
        COALESCE(dp.first_name_en, '') || ' ' || COALESCE(dp.last_name_en, '') as user_name,
        r.booking_id, r.reviewable_type, r.reviewable_id,
        CASE
          WHEN r.reviewable_type = 'center' THEN (SELECT name_en FROM diving_centers WHERE id = r.reviewable_id)
          WHEN r.reviewable_type = 'site' THEN (SELECT name_en FROM dive_sites WHERE id = r.reviewable_id)
          ELSE 'Unknown'
        END as reviewable_name,
        r.rating, r.title, r.content, r.is_verified_booking,
        r.helpful_count, r.reported_count, r.status,
        r.moderated_at, r.moderated_by, r.created_at
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       LEFT JOIN diver_profiles dp ON dp.user_id = u.id
       WHERE r.id = $1`,
      [reviewId]
    );

    return this.mapToReviewWithDetails(result.rows[0]);
  }

  // ============================================================================
  // SITE MANAGEMENT
  // ============================================================================

  async listSites(filters: SiteFilters): Promise<{ sites: DiveSiteAdmin[]; total: number }> {
    const { page = 1, limit = 20, regionId, isActive, search } = filters;
    const offset = (page - 1) * limit;
    const params: unknown[] = [];
    let paramIndex = 1;
    const conditions: string[] = [];

    if (regionId) {
      conditions.push(`ds.region_id = $${paramIndex++}`);
      params.push(regionId);
    }

    if (isActive !== undefined) {
      conditions.push(`ds.is_active = $${paramIndex++}`);
      params.push(isActive);
    }

    if (search) {
      conditions.push(`(ds.name_en ILIKE $${paramIndex} OR ds.name_ar ILIKE $${paramIndex} OR ds.srsa_site_code ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await db.query<{ count: string }>(
      `SELECT COUNT(*) FROM dive_sites ds ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const result = await db.query(
      `SELECT
        ds.id, ds.srsa_site_code, ds.name_en, ds.name_ar, ds.region_id,
        r.name_en as region_name,
        ds.latitude, ds.longitude, ds.max_depth_meters, ds.min_depth_meters,
        ds.min_certification_level, ds.min_logged_dives, ds.daily_diver_quota,
        ds.conservation_zone, ds.conservation_fee_sar, ds.marine_protected_area,
        ds.is_active, ds.created_at, ds.updated_at
       FROM dive_sites ds
       LEFT JOIN regions r ON ds.region_id = r.id
       ${whereClause}
       ORDER BY ds.name_en ASC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params
    );

    return {
      sites: result.rows.map(this.mapToDiveSiteAdmin),
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  async updateSite(siteId: string, adminId: string, dto: UpdateSiteDto): Promise<DiveSiteAdmin> {
    const site = await db.query('SELECT * FROM dive_sites WHERE id = $1', [siteId]);
    if (site.rows.length === 0) {
      throw new NotFoundError('Dive site');
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, string> = {
      nameEn: 'name_en',
      nameAr: 'name_ar',
      maxDepthMeters: 'max_depth_meters',
      minDepthMeters: 'min_depth_meters',
      minCertificationLevel: 'min_certification_level',
      minLoggedDives: 'min_logged_dives',
      dailyDiverQuota: 'daily_diver_quota',
      conservationZone: 'conservation_zone',
      conservationFeeSar: 'conservation_fee_sar',
      marineProtectedArea: 'marine_protected_area',
    };

    for (const [key, dbField] of Object.entries(fieldMap)) {
      const value = dto[key as keyof UpdateSiteDto];
      if (value !== undefined) {
        updates.push(`${dbField} = $${paramIndex++}`);
        values.push(value);
      }
    }

    // Handle array/JSON fields
    if (dto.seasonalRestrictions !== undefined) {
      updates.push(`seasonal_restrictions = $${paramIndex++}`);
      values.push(JSON.stringify(dto.seasonalRestrictions));
    }
    if (dto.hazards !== undefined) {
      updates.push(`hazards = $${paramIndex++}`);
      values.push(dto.hazards);
    }
    if (dto.features !== undefined) {
      updates.push(`features = $${paramIndex++}`);
      values.push(dto.features);
    }
    if (dto.marinLife !== undefined) {
      updates.push(`marine_life = $${paramIndex++}`);
      values.push(dto.marinLife);
    }

    if (updates.length > 0) {
      values.push(siteId);
      await db.query(
        `UPDATE dive_sites SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`,
        values
      );

      // Log audit
      await this.logAction(adminId, 'update_site', 'dive_site', siteId, {
        changes: dto,
      });
    }

    // Fetch and return updated site
    const result = await db.query(
      `SELECT
        ds.id, ds.srsa_site_code, ds.name_en, ds.name_ar, ds.region_id,
        r.name_en as region_name,
        ds.latitude, ds.longitude, ds.max_depth_meters, ds.min_depth_meters,
        ds.min_certification_level, ds.min_logged_dives, ds.daily_diver_quota,
        ds.conservation_zone, ds.conservation_fee_sar, ds.marine_protected_area,
        ds.is_active, ds.created_at, ds.updated_at
       FROM dive_sites ds
       LEFT JOIN regions r ON ds.region_id = r.id
       WHERE ds.id = $1`,
      [siteId]
    );

    return this.mapToDiveSiteAdmin(result.rows[0]);
  }

  async toggleSiteStatus(siteId: string, adminId: string, isActive: boolean, reason?: string): Promise<DiveSiteAdmin> {
    const site = await db.query('SELECT * FROM dive_sites WHERE id = $1', [siteId]);
    if (site.rows.length === 0) {
      throw new NotFoundError('Dive site');
    }

    await db.query(
      'UPDATE dive_sites SET is_active = $1, updated_at = NOW() WHERE id = $2',
      [isActive, siteId]
    );

    // Log audit
    await this.logAction(adminId, isActive ? 'activate_site' : 'deactivate_site', 'dive_site', siteId, {
      reason,
      previousStatus: site.rows[0].is_active,
    });

    // Fetch and return updated site
    const result = await db.query(
      `SELECT
        ds.id, ds.srsa_site_code, ds.name_en, ds.name_ar, ds.region_id,
        r.name_en as region_name,
        ds.latitude, ds.longitude, ds.max_depth_meters, ds.min_depth_meters,
        ds.min_certification_level, ds.min_logged_dives, ds.daily_diver_quota,
        ds.conservation_zone, ds.conservation_fee_sar, ds.marine_protected_area,
        ds.is_active, ds.created_at, ds.updated_at
       FROM dive_sites ds
       LEFT JOIN regions r ON ds.region_id = r.id
       WHERE ds.id = $1`,
      [siteId]
    );

    return this.mapToDiveSiteAdmin(result.rows[0]);
  }

  // ============================================================================
  // AUDIT LOGS
  // ============================================================================

  async logAction(
    adminId: string,
    action: string,
    entityType: string,
    entityId: string | null,
    details: Record<string, unknown>
  ): Promise<void> {
    await db.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, action, entityType, entityId, JSON.stringify(details)]
    );
  }

  async getAuditLogs(filters: AuditLogFilters): Promise<{ logs: AuditLogEntry[]; total: number }> {
    const { page = 1, limit = 20, userId, action, entityType, dateFrom, dateTo } = filters;
    const offset = (page - 1) * limit;
    const params: unknown[] = [];
    let paramIndex = 1;
    const conditions: string[] = [];

    if (userId) {
      conditions.push(`al.user_id = $${paramIndex++}`);
      params.push(userId);
    }

    if (action) {
      conditions.push(`al.action ILIKE $${paramIndex++}`);
      params.push(`%${action}%`);
    }

    if (entityType) {
      conditions.push(`al.entity_type = $${paramIndex++}`);
      params.push(entityType);
    }

    if (dateFrom) {
      conditions.push(`al.created_at >= $${paramIndex++}`);
      params.push(dateFrom);
    }

    if (dateTo) {
      conditions.push(`al.created_at <= $${paramIndex++}`);
      params.push(dateTo);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await db.query<{ count: string }>(
      `SELECT COUNT(*) FROM audit_logs al ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const result = await db.query(
      `SELECT
        al.id, al.user_id, u.email as user_email, al.action, al.entity_type,
        al.entity_id, al.old_values, al.new_values, al.ip_address,
        al.user_agent, al.request_id, al.created_at
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params
    );

    return {
      logs: result.rows.map(this.mapToAuditLogEntry),
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  // ============================================================================
  // MAPPERS
  // ============================================================================

  private mapToCenterWithVerification(row: Record<string, unknown>): CenterWithVerification {
    return {
      id: row.id as string,
      nameEn: row.name_en as string,
      nameAr: row.name_ar as string | null,
      ownerUserId: row.owner_user_id as string,
      ownerEmail: row.owner_email as string,
      srsaLicenseNumber: row.srsa_license_number as string | null,
      licenseExpiryDate: row.license_expiry_date ? (row.license_expiry_date as Date).toISOString() : null,
      licenseStatus: row.license_status as CenterWithVerification['licenseStatus'],
      commercialRegistration: row.commercial_registration as string | null,
      vatNumber: row.vat_number as string | null,
      city: row.city as string | null,
      email: row.email as string | null,
      phone: row.phone_primary as string | null,
      createdAt: (row.created_at as Date).toISOString(),
      documentsCount: parseInt(row.documents_count as string, 10) || 0,
    };
  }

  private mapToCertificationWithUser(row: Record<string, unknown>): CertificationWithUser {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      userEmail: row.user_email as string,
      userName: (row.user_name as string).trim() || 'Unknown',
      agency: row.agency as string,
      certificationType: row.certification_type as string,
      certificationNumber: row.certification_number as string | null,
      certificationLevel: row.certification_level as string | null,
      issueDate: row.issue_date ? (row.issue_date as Date).toISOString() : null,
      expiryDate: row.expiry_date ? (row.expiry_date as Date).toISOString() : null,
      verificationStatus: row.verification_status as CertificationWithUser['verificationStatus'],
      documentUrl: row.document_url as string | null,
      createdAt: (row.created_at as Date).toISOString(),
    };
  }

  private mapToUserWithDetails(row: Record<string, unknown>): UserWithDetails {
    return {
      id: row.id as string,
      email: row.email as string,
      phoneNumber: row.phone_number as string | null,
      role: row.role as UserWithDetails['role'],
      status: row.status as UserWithDetails['status'],
      preferredLanguage: row.preferred_language as string,
      emailVerifiedAt: row.email_verified_at ? (row.email_verified_at as Date).toISOString() : null,
      phoneVerifiedAt: row.phone_verified_at ? (row.phone_verified_at as Date).toISOString() : null,
      lastLoginAt: row.last_login_at ? (row.last_login_at as Date).toISOString() : null,
      failedLoginAttempts: row.failed_login_attempts as number,
      lockedUntil: row.locked_until ? (row.locked_until as Date).toISOString() : null,
      createdAt: (row.created_at as Date).toISOString(),
      updatedAt: (row.updated_at as Date).toISOString(),
      profile: row.first_name_en ? {
        firstNameEn: row.first_name_en as string | null,
        firstNameAr: row.first_name_ar as string | null,
        lastNameEn: row.last_name_en as string | null,
        lastNameAr: row.last_name_ar as string | null,
        dateOfBirth: row.date_of_birth ? (row.date_of_birth as Date).toISOString() : null,
        nationality: row.nationality as string | null,
      } : null,
      certificationsCount: parseInt(row.certifications_count as string, 10) || 0,
      bookingsCount: parseInt(row.bookings_count as string, 10) || 0,
    };
  }

  private mapToReviewWithDetails(row: Record<string, unknown>): ReviewWithDetails {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      userEmail: row.user_email as string,
      userName: (row.user_name as string).trim() || 'Unknown',
      bookingId: row.booking_id as string | null,
      reviewableType: row.reviewable_type as string,
      reviewableId: row.reviewable_id as string,
      reviewableName: row.reviewable_name as string,
      rating: row.rating as number,
      title: row.title as string | null,
      content: row.content as string | null,
      isVerifiedBooking: row.is_verified_booking as boolean,
      helpfulCount: row.helpful_count as number,
      reportedCount: row.reported_count as number,
      status: row.status as string,
      moderatedAt: row.moderated_at ? (row.moderated_at as Date).toISOString() : null,
      moderatedBy: row.moderated_by as string | null,
      createdAt: (row.created_at as Date).toISOString(),
    };
  }

  private mapToDiveSiteAdmin(row: Record<string, unknown>): DiveSiteAdmin {
    return {
      id: row.id as string,
      srsaSiteCode: row.srsa_site_code as string,
      nameEn: row.name_en as string,
      nameAr: row.name_ar as string | null,
      regionId: row.region_id as string | null,
      regionName: row.region_name as string | null,
      latitude: parseFloat(row.latitude as string),
      longitude: parseFloat(row.longitude as string),
      maxDepthMeters: row.max_depth_meters as number | null,
      minDepthMeters: row.min_depth_meters as number | null,
      minCertificationLevel: row.min_certification_level as string | null,
      minLoggedDives: row.min_logged_dives as number,
      dailyDiverQuota: row.daily_diver_quota as number | null,
      conservationZone: row.conservation_zone as string,
      conservationFeeSar: parseFloat(row.conservation_fee_sar as string),
      marineProtectedArea: row.marine_protected_area as boolean,
      isActive: row.is_active as boolean,
      createdAt: (row.created_at as Date).toISOString(),
      updatedAt: (row.updated_at as Date).toISOString(),
    };
  }

  private mapToAuditLogEntry(row: Record<string, unknown>): AuditLogEntry {
    return {
      id: row.id as string,
      userId: row.user_id as string | null,
      userEmail: row.user_email as string | null,
      action: row.action as string,
      entityType: row.entity_type as string,
      entityId: row.entity_id as string | null,
      oldValues: row.old_values as Record<string, unknown> | null,
      newValues: row.new_values as Record<string, unknown> | null,
      ipAddress: row.ip_address as string | null,
      userAgent: row.user_agent as string | null,
      requestId: row.request_id as string | null,
      createdAt: (row.created_at as Date).toISOString(),
    };
  }
}

export const adminService = new AdminService();
