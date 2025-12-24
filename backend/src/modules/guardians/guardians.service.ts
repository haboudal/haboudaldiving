import { db } from '../../config/database';
import { NotFoundError, ForbiddenError, ConflictError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { notificationsService } from '../notifications/notifications.service';

interface LinkedMinor {
  id: string;
  minorUserId: string;
  minorEmail: string;
  minorName: string;
  relationship: string;
  consentGivenAt?: Date;
  isPrimary: boolean;
  isActive: boolean;
}

interface PendingApproval {
  id: string;
  type: 'link_request' | 'booking_approval';
  minorUserId: string;
  minorName: string;
  details: Record<string, unknown>;
  createdAt: Date;
}

export class GuardiansService {
  async getLinkedMinors(parentUserId: string): Promise<LinkedMinor[]> {
    const result = await db.query<{
      id: string;
      minor_user_id: string;
      relationship: string;
      consent_given_at: Date;
      is_primary: boolean;
      is_active: boolean;
      email: string;
      first_name_en: string;
      last_name_en: string;
    }>(
      `SELECT pgl.*, u.email, dp.first_name_en, dp.last_name_en
       FROM parent_guardian_links pgl
       JOIN users u ON u.id = pgl.minor_user_id
       LEFT JOIN diver_profiles dp ON dp.user_id = pgl.minor_user_id
       WHERE pgl.parent_user_id = $1 AND pgl.is_active = true
       ORDER BY pgl.created_at DESC`,
      [parentUserId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      minorUserId: row.minor_user_id,
      minorEmail: row.email,
      minorName: `${row.first_name_en || ''} ${row.last_name_en || ''}`.trim(),
      relationship: row.relationship,
      consentGivenAt: row.consent_given_at,
      isPrimary: row.is_primary,
      isActive: row.is_active,
    }));
  }

  async initiateLink(parentUserId: string, minorEmail: string, relationship: string): Promise<{ linkId: string }> {
    // Find minor user
    const minorResult = await db.query<{ id: string; is_minor: boolean }>(
      `SELECT u.id, dp.is_minor FROM users u
       LEFT JOIN diver_profiles dp ON dp.user_id = u.id
       WHERE u.email = $1`,
      [minorEmail.toLowerCase()]
    );

    if (minorResult.rows.length === 0) {
      throw new NotFoundError('Minor account');
    }

    const minor = minorResult.rows[0];

    if (!minor.is_minor) {
      throw new ForbiddenError('The specified user is not a minor account');
    }

    // Check if link already exists
    const existingLink = await db.query(
      'SELECT id FROM parent_guardian_links WHERE parent_user_id = $1 AND minor_user_id = $2',
      [parentUserId, minor.id]
    );

    if (existingLink.rows.length > 0) {
      throw new ConflictError('Link already exists');
    }

    // Create link (pending consent)
    const result = await db.query<{ id: string }>(
      `INSERT INTO parent_guardian_links (parent_user_id, minor_user_id, relationship, is_primary)
       VALUES ($1, $2, $3, false)
       RETURNING id`,
      [parentUserId, minor.id, relationship]
    );

    // Send notification to minor for approval
    await notificationsService.send({
      userId: minor.id,
      type: 'consent_requested',
      channels: ['email', 'in_app'],
      title: 'Parent Link Request',
      body: 'A parent/guardian has requested to link with your account.',
      data: {
        linkId: result.rows[0].id,
        relationship,
      },
    }).catch((err) => {
      logger.error('Failed to send parent link notification', { minorUserId: minor.id, error: err.message });
    });

    logger.info('Parent-minor link initiated', {
      parentUserId,
      minorUserId: minor.id,
      linkId: result.rows[0].id,
    });

    return { linkId: result.rows[0].id };
  }

  async giveConsent(parentUserId: string, minorUserId: string, ipAddress?: string): Promise<void> {
    // Verify link exists
    const linkResult = await db.query<{ id: string }>(
      `SELECT id FROM parent_guardian_links
       WHERE parent_user_id = $1 AND minor_user_id = $2 AND is_active = true`,
      [parentUserId, minorUserId]
    );

    if (linkResult.rows.length === 0) {
      throw new NotFoundError('Parent-minor link');
    }

    await db.query(
      `UPDATE parent_guardian_links
       SET consent_given_at = NOW(), consent_ip_address = $3
       WHERE id = $1`,
      [linkResult.rows[0].id, ipAddress]
    );

    logger.info('Parent consent given', { parentUserId, minorUserId });
  }

  async revokeConsent(parentUserId: string, minorUserId: string): Promise<void> {
    const result = await db.query(
      `UPDATE parent_guardian_links
       SET is_active = false, updated_at = NOW()
       WHERE parent_user_id = $1 AND minor_user_id = $2`,
      [parentUserId, minorUserId]
    );

    if (result.rowCount === 0) {
      throw new NotFoundError('Parent-minor link');
    }

    logger.info('Parent consent revoked', { parentUserId, minorUserId });
  }

  async getPendingApprovals(parentUserId: string): Promise<PendingApproval[]> {
    // Get pending bookings that need parent approval
    const bookingsResult = await db.query<{
      id: string;
      user_id: string;
      first_name_en: string;
      last_name_en: string;
      trip_title: string;
      trip_date: Date;
      created_at: Date;
    }>(
      `SELECT b.id, b.user_id, dp.first_name_en, dp.last_name_en, t.title_en as trip_title,
              t.departure_datetime as trip_date, b.created_at
       FROM bookings b
       JOIN parent_guardian_links pgl ON pgl.minor_user_id = b.user_id
       JOIN diver_profiles dp ON dp.user_id = b.user_id
       JOIN trips t ON t.id = b.trip_id
       WHERE pgl.parent_user_id = $1
       AND pgl.consent_given_at IS NOT NULL
       AND b.parent_consent_required = true
       AND b.parent_consent_given_at IS NULL
       AND b.status = 'pending'
       ORDER BY b.created_at DESC`,
      [parentUserId]
    );

    return bookingsResult.rows.map((row) => ({
      id: row.id,
      type: 'booking_approval' as const,
      minorUserId: row.user_id,
      minorName: `${row.first_name_en || ''} ${row.last_name_en || ''}`.trim(),
      details: {
        tripTitle: row.trip_title,
        tripDate: row.trip_date,
      },
      createdAt: row.created_at,
    }));
  }

  async approveBooking(parentUserId: string, bookingId: string): Promise<void> {
    // Verify parent has authority over this booking
    const result = await db.query(
      `SELECT b.id FROM bookings b
       JOIN parent_guardian_links pgl ON pgl.minor_user_id = b.user_id
       WHERE b.id = $1 AND pgl.parent_user_id = $2
       AND pgl.consent_given_at IS NOT NULL AND pgl.is_active = true`,
      [bookingId, parentUserId]
    );

    if (result.rows.length === 0) {
      throw new ForbiddenError('Not authorized to approve this booking');
    }

    await db.query(
      `UPDATE bookings
       SET parent_consent_given_at = NOW(), parent_consent_by = $2
       WHERE id = $1`,
      [bookingId, parentUserId]
    );

    logger.info('Booking approved by parent', { bookingId, parentUserId });
  }
}

export const guardiansService = new GuardiansService();
