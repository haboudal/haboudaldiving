import { db } from '../../../config/database';
import { NotFoundError, ForbiddenError, ValidationError } from '../../../utils/errors';
import { calculateAge, isMinor } from '../../../utils/helpers';
import { logger } from '../../../utils/logger';
import { diversService } from '../../divers/divers.service';
import { centersService } from '../../centers/centers.service';
import { tripsService } from '../trips.service';
import { notificationsService } from '../../notifications/notifications.service';
import { srsaQuotaService } from '../../../integrations/srsa/quota.service';
import { Trip } from '../trips.types';
import {
  Booking,
  BookingWithDetails,
  WaitingListEntry,
  BookingPriceBreakdown,
  CreateBookingDto,
  UpdateBookingDto,
  CancelBookingDto,
  BookingFilters,
  EligibilityResult,
  CreateBookingResult,
  CancelBookingResult,
  EquipmentSizes,
} from './bookings.types';

// Platform constants
const PLATFORM_FEE_PERCENT = 0.05; // 5%
const VAT_PERCENT = 0.15; // 15%
const INSURANCE_FEE_PER_DIVER = 15; // 15 SAR

// Certification hierarchy for eligibility checking
const CERTIFICATION_LEVELS = [
  'Open Water',
  'Advanced Open Water',
  'Rescue Diver',
  'Divemaster',
  'Instructor',
];

export class BookingsService {
  async findByTrip(
    tripId: string,
    filters: BookingFilters
  ): Promise<{ bookings: BookingWithDetails[]; total: number }> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const offset = (page - 1) * limit;

    const conditions: string[] = ['b.trip_id = $1'];
    const params: unknown[] = [tripId];
    let paramIndex = 2;

    if (filters.status) {
      conditions.push(`b.status = $${paramIndex++}`);
      params.push(filters.status);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await db.query<{ count: string }>(
      `SELECT COUNT(*) FROM bookings b WHERE ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const result = await db.query(
      `SELECT b.*,
        t.title_en AS trip_title,
        dp.first_name_en || ' ' || dp.last_name_en AS user_name,
        u.email AS user_email,
        dc.name_en AS center_name
      FROM bookings b
      JOIN trips t ON b.trip_id = t.id
      JOIN users u ON b.user_id = u.id
      LEFT JOIN diver_profiles dp ON b.user_id = dp.user_id
      JOIN diving_centers dc ON b.center_id = dc.id
      WHERE ${whereClause}
      ORDER BY b.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params
    );

    return {
      bookings: result.rows.map(this.mapToBookingWithDetails),
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  async findByUser(
    userId: string,
    filters: BookingFilters
  ): Promise<{ bookings: BookingWithDetails[]; total: number }> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const offset = (page - 1) * limit;

    const conditions: string[] = ['b.user_id = $1'];
    const params: unknown[] = [userId];
    let paramIndex = 2;

    if (filters.status) {
      conditions.push(`b.status = $${paramIndex++}`);
      params.push(filters.status);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await db.query<{ count: string }>(
      `SELECT COUNT(*) FROM bookings b WHERE ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const result = await db.query(
      `SELECT b.*,
        t.title_en AS trip_title,
        dp.first_name_en || ' ' || dp.last_name_en AS user_name,
        u.email AS user_email,
        dc.name_en AS center_name
      FROM bookings b
      JOIN trips t ON b.trip_id = t.id
      JOIN users u ON b.user_id = u.id
      LEFT JOIN diver_profiles dp ON b.user_id = dp.user_id
      JOIN diving_centers dc ON b.center_id = dc.id
      WHERE ${whereClause}
      ORDER BY t.departure_datetime DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params
    );

    return {
      bookings: result.rows.map(this.mapToBookingWithDetails),
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  async findById(bookingId: string): Promise<BookingWithDetails> {
    const result = await db.query(
      `SELECT b.*,
        t.title_en AS trip_title,
        dp.first_name_en || ' ' || dp.last_name_en AS user_name,
        u.email AS user_email,
        dc.name_en AS center_name
      FROM bookings b
      JOIN trips t ON b.trip_id = t.id
      JOIN users u ON b.user_id = u.id
      LEFT JOIN diver_profiles dp ON b.user_id = dp.user_id
      JOIN diving_centers dc ON b.center_id = dc.id
      WHERE b.id = $1`,
      [bookingId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Booking');
    }

    return this.mapToBookingWithDetails(result.rows[0]);
  }

  async create(tripId: string, userId: string, dto: CreateBookingDto): Promise<CreateBookingResult> {
    const trip = await tripsService.findById(tripId);

    // Verify trip is bookable
    if (trip.status !== 'published' && trip.status !== 'full') {
      throw new ValidationError(`Cannot book a trip with status: ${trip.status}`);
    }

    const numberOfDivers = dto.numberOfDivers || 1;

    // Check capacity
    const availableSpots = trip.maxParticipants - trip.currentParticipants;
    if (availableSpots < numberOfDivers) {
      if (trip.status === 'full' || availableSpots === 0) {
        // Offer to join waiting list
        const position = await this.joinWaitingList(tripId, userId);
        return {
          waitingList: true,
          position,
        };
      }
      throw new ValidationError(`Only ${availableSpots} spots available, but you requested ${numberOfDivers}`);
    }

    // Check if user already has a booking for this trip
    const existingBooking = await db.query(
      `SELECT id FROM bookings WHERE trip_id = $1 AND user_id = $2 AND status NOT IN ('cancelled', 'refunded')`,
      [tripId, userId]
    );

    if (existingBooking.rows.length > 0) {
      throw new ValidationError('You already have a booking for this trip');
    }

    // Check diver eligibility
    const eligibility = await this.checkDiverEligibility(userId, trip);
    if (!eligibility.eligible) {
      throw new ValidationError(`Not eligible for this trip: ${eligibility.reasons.join(', ')}`);
    }

    // Check if user is minor
    const userResult = await db.query(
      'SELECT is_minor FROM diver_profiles WHERE user_id = $1',
      [userId]
    );
    const isUserMinor = userResult.rows[0]?.is_minor || false;

    // Calculate pricing
    const pricing = await this.calculateBookingPrice(trip, dto);

    // Create booking
    const result = await db.query<{ id: string; booking_number: string }>(
      `INSERT INTO bookings (
        trip_id, user_id, center_id,
        status, number_of_divers,
        base_price_sar, equipment_rental_sar, conservation_fee_sar,
        insurance_fee_sar, platform_fee_sar, vat_amount_sar,
        discount_amount_sar, total_amount_sar,
        special_requests, dietary_requirements, equipment_sizes,
        parent_consent_required
      ) VALUES (
        $1, $2, $3, 'pending', $4,
        $5, $6, $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16
      ) RETURNING id, booking_number`,
      [
        tripId,
        userId,
        trip.centerId,
        numberOfDivers,
        pricing.basePriceSar,
        pricing.equipmentRentalSar,
        pricing.conservationFeeSar,
        pricing.insuranceFeeSar,
        pricing.platformFeeSar,
        pricing.vatAmountSar,
        pricing.discountAmountSar,
        pricing.totalAmountSar,
        dto.specialRequests || null,
        dto.dietaryRequirements || null,
        dto.equipmentSizes ? JSON.stringify(dto.equipmentSizes) : null,
        isUserMinor,
      ]
    );

    // Update trip status if now full
    await tripsService.updateStatusIfFull(tripId);

    const booking = await this.findById(result.rows[0].id);

    return {
      booking,
      parentConsentRequired: isUserMinor,
    };
  }

  async update(bookingId: string, userId: string, dto: UpdateBookingDto): Promise<Booking> {
    const booking = await this.findById(bookingId);

    // Verify ownership
    if (booking.userId !== userId) {
      // Check if user is center staff
      try {
        await centersService.verifyOwnership(booking.centerId, userId);
      } catch {
        throw new ForbiddenError('Not authorized to update this booking');
      }
    }

    // Cannot update cancelled/completed bookings
    if (['cancelled', 'refunded', 'completed'].includes(booking.status)) {
      throw new ValidationError(`Cannot update a ${booking.status} booking`);
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (dto.specialRequests !== undefined) {
      updates.push(`special_requests = $${paramIndex++}`);
      values.push(dto.specialRequests);
    }

    if (dto.dietaryRequirements !== undefined) {
      updates.push(`dietary_requirements = $${paramIndex++}`);
      values.push(dto.dietaryRequirements);
    }

    if (dto.equipmentSizes !== undefined) {
      updates.push(`equipment_sizes = $${paramIndex++}`);
      values.push(JSON.stringify(dto.equipmentSizes));
    }

    if (updates.length > 0) {
      values.push(bookingId);
      await db.query(
        `UPDATE bookings SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`,
        values
      );
    }

    return this.findById(bookingId);
  }

  async cancel(
    bookingId: string,
    userId: string,
    dto: CancelBookingDto
  ): Promise<CancelBookingResult> {
    const booking = await this.findById(bookingId);

    // Verify ownership or center access
    if (booking.userId !== userId) {
      try {
        await centersService.verifyOwnership(booking.centerId, userId);
      } catch {
        throw new ForbiddenError('Not authorized to cancel this booking');
      }
    }

    if (['cancelled', 'refunded', 'completed'].includes(booking.status)) {
      throw new ValidationError(`Booking is already ${booking.status}`);
    }

    const trip = await tripsService.findById(booking.tripId);
    const refundAmount = await this.calculateRefund(booking, trip);

    await db.query(
      `UPDATE bookings SET
        status = 'cancelled',
        cancellation_reason = $2,
        cancelled_at = NOW(),
        cancelled_by = $3,
        refund_amount_sar = $4,
        updated_at = NOW()
      WHERE id = $1`,
      [bookingId, dto.reason, userId, refundAmount]
    );

    // Update trip status (might reopen spots)
    await tripsService.updateStatusIfFull(booking.tripId);

    // Notify waiting list if there are now available spots
    await this.notifyWaitingList(booking.tripId);

    return { refundAmount };
  }

  async checkIn(bookingId: string, staffUserId: string): Promise<Booking> {
    const booking = await this.findById(bookingId);

    // Verify staff belongs to center
    await centersService.verifyOwnership(booking.centerId, staffUserId);

    if (booking.status !== 'paid' && booking.status !== 'confirmed') {
      throw new ValidationError(`Cannot check in a booking with status: ${booking.status}`);
    }

    await db.query(
      `UPDATE bookings SET
        status = 'checked_in',
        checked_in_at = NOW(),
        checked_in_by = $2,
        updated_at = NOW()
      WHERE id = $1`,
      [bookingId, staffUserId]
    );

    return this.findById(bookingId);
  }

  async signWaiver(bookingId: string, userId: string, ipAddress: string): Promise<Booking> {
    const booking = await this.findById(bookingId);

    if (booking.userId !== userId) {
      throw new ForbiddenError('Not authorized to sign waiver for this booking');
    }

    await db.query(
      `UPDATE bookings SET
        waiver_signed_at = NOW(),
        waiver_ip_address = $2,
        updated_at = NOW()
      WHERE id = $1`,
      [bookingId, ipAddress]
    );

    return this.findById(bookingId);
  }

  async joinWaitingList(tripId: string, userId: string): Promise<number> {
    // Check if already on waiting list
    const existing = await db.query(
      'SELECT id FROM booking_waiting_list WHERE trip_id = $1 AND user_id = $2',
      [tripId, userId]
    );

    if (existing.rows.length > 0) {
      throw new ValidationError('You are already on the waiting list for this trip');
    }

    // Get next position
    const positionResult = await db.query<{ max_position: number }>(
      'SELECT COALESCE(MAX(position), 0) AS max_position FROM booking_waiting_list WHERE trip_id = $1',
      [tripId]
    );
    const nextPosition = (positionResult.rows[0].max_position || 0) + 1;

    await db.query(
      `INSERT INTO booking_waiting_list (trip_id, user_id, position) VALUES ($1, $2, $3)`,
      [tripId, userId, nextPosition]
    );

    return nextPosition;
  }

  async leaveWaitingList(tripId: string, userId: string): Promise<void> {
    const result = await db.query(
      'DELETE FROM booking_waiting_list WHERE trip_id = $1 AND user_id = $2',
      [tripId, userId]
    );

    if (result.rowCount === 0) {
      throw new NotFoundError('Waiting list entry');
    }

    // Reorder positions
    await db.query(
      `WITH ranked AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY position) as new_position
        FROM booking_waiting_list WHERE trip_id = $1
      )
      UPDATE booking_waiting_list SET position = ranked.new_position
      FROM ranked WHERE booking_waiting_list.id = ranked.id`,
      [tripId]
    );
  }

  async getWaitingList(tripId: string): Promise<WaitingListEntry[]> {
    const result = await db.query(
      `SELECT wl.*, dp.first_name_en || ' ' || dp.last_name_en AS user_name, u.email AS user_email
       FROM booking_waiting_list wl
       JOIN users u ON wl.user_id = u.id
       LEFT JOIN diver_profiles dp ON wl.user_id = dp.user_id
       WHERE wl.trip_id = $1
       ORDER BY wl.position ASC`,
      [tripId]
    );

    return result.rows.map((row) => ({
      id: row.id as string,
      tripId: row.trip_id as string,
      userId: row.user_id as string,
      userName: row.user_name as string,
      userEmail: row.user_email as string,
      position: row.position as number,
      notifiedAt: row.notified_at as Date | undefined,
      expiresAt: row.expires_at as Date | undefined,
      createdAt: row.created_at as Date,
    }));
  }

  async checkDiverEligibility(userId: string, trip: Trip): Promise<EligibilityResult> {
    const reasons: string[] = [];

    try {
      const profile = await diversService.getProfile(userId);

      // Check age
      if (profile.dateOfBirth) {
        const age = calculateAge(profile.dateOfBirth);
        if (age < trip.minAge) {
          reasons.push(`Minimum age is ${trip.minAge} years (you are ${age})`);
        }
        if (trip.maxAge && age > trip.maxAge) {
          reasons.push(`Maximum age is ${trip.maxAge} years (you are ${age})`);
        }
      }

      // Check logged dives
      if (trip.minLoggedDives > 0) {
        const totalDives = profile.totalLoggedDives || 0;
        if (totalDives < trip.minLoggedDives) {
          reasons.push(`Minimum ${trip.minLoggedDives} logged dives required (you have ${totalDives})`);
        }
      }

      // Check certification level
      if (trip.minCertificationLevel) {
        const certs = await diversService.getCertifications(userId);
        const requiredIndex = CERTIFICATION_LEVELS.findIndex(
          (level) => level.toLowerCase() === trip.minCertificationLevel!.toLowerCase()
        );

        if (requiredIndex >= 0) {
          const hasRequiredCert = certs.some((cert) => {
            const certIndex = CERTIFICATION_LEVELS.findIndex(
              (level) => level.toLowerCase() === (cert.certificationLevel || '').toLowerCase()
            );
            return certIndex >= requiredIndex && cert.verificationStatus === 'verified';
          });

          if (!hasRequiredCert) {
            reasons.push(`${trip.minCertificationLevel} certification or higher required`);
          }
        }
      }
    } catch (error) {
      // If diver profile doesn't exist, they might still be eligible for beginner trips
      if (trip.minLoggedDives > 0 || trip.minCertificationLevel) {
        reasons.push('Diver profile not found - please complete your profile');
      }
    }

    return {
      eligible: reasons.length === 0,
      reasons,
    };
  }

  async calculateBookingPrice(trip: Trip, dto: CreateBookingDto): Promise<BookingPriceBreakdown> {
    const numberOfDivers = dto.numberOfDivers || 1;

    // Base price
    const basePriceSar = trip.pricePerPersonSar * numberOfDivers;

    // Equipment rental
    const equipmentRentalSar =
      dto.needsEquipment && trip.equipmentRentalPriceSar
        ? trip.equipmentRentalPriceSar * numberOfDivers
        : 0;

    // Conservation fee (if not included in trip price)
    let conservationFeeSar = 0;
    if (!trip.conservationFeeIncluded && trip.siteId) {
      // Get actual zone-based fee from SRSA service
      const siteInfo = await srsaQuotaService.getSiteInfo(trip.siteId);
      const feePerDiver = siteInfo?.feePerDiver ?? 35; // Default zone_2 if site not found
      conservationFeeSar = feePerDiver * numberOfDivers;
    }

    // Insurance fee
    const insuranceFeeSar = INSURANCE_FEE_PER_DIVER * numberOfDivers;

    // Platform fee (5% of base price)
    const platformFeeSar = Math.round(basePriceSar * PLATFORM_FEE_PERCENT * 100) / 100;

    // VAT (15% on base + platform fee)
    const vatAmountSar = Math.round((basePriceSar + platformFeeSar) * VAT_PERCENT * 100) / 100;

    // Total
    const totalAmountSar =
      basePriceSar +
      equipmentRentalSar +
      conservationFeeSar +
      insuranceFeeSar +
      platformFeeSar +
      vatAmountSar;

    return {
      basePriceSar,
      equipmentRentalSar,
      conservationFeeSar,
      insuranceFeeSar,
      platformFeeSar,
      vatAmountSar,
      discountAmountSar: 0,
      totalAmountSar: Math.round(totalAmountSar * 100) / 100,
    };
  }

  async calculateRefund(booking: Booking, trip: Trip): Promise<number> {
    const now = new Date();
    const departure = new Date(trip.departureDatetime);
    const hoursUntilDeparture = (departure.getTime() - now.getTime()) / (1000 * 60 * 60);

    // If past deadline, no refund
    if (hoursUntilDeparture < trip.cancellationDeadlineHours) {
      return 0;
    }

    // Full refund if more than 48 hours before departure
    if (hoursUntilDeparture >= 48) {
      return booking.totalAmountSar;
    }

    // 50% refund if between deadline and 48 hours
    return Math.round(booking.totalAmountSar * 0.5 * 100) / 100;
  }

  private async notifyWaitingList(tripId: string): Promise<void> {
    // Get trip to check available spots
    const trip = await tripsService.findById(tripId);
    const availableSpots = trip.maxParticipants - trip.currentParticipants;

    if (availableSpots <= 0) {
      return;
    }

    // Get first person on waiting list
    const waitingList = await this.getWaitingList(tripId);
    if (waitingList.length === 0) {
      return;
    }

    // Mark as notified and send notification
    const firstInLine = waitingList[0];
    await db.query(
      `UPDATE booking_waiting_list SET
        notified_at = NOW(),
        expires_at = NOW() + INTERVAL '24 hours'
      WHERE id = $1`,
      [firstInLine.id]
    );

    // Send notification to user about available spot
    await notificationsService.send({
      userId: firstInLine.userId,
      type: 'waitlist_available',
      channels: ['email', 'push', 'sms'],
      title: 'Spot Available!',
      body: `A spot has opened up for ${trip.titleEn}. Book now before it's gone!`,
      priority: 'high',
      data: {
        tripId,
        tripName: trip.titleEn,
        tripDate: trip.departureDatetime.toISOString().split('T')[0],
        expiresIn: '24 hours',
      },
    }).catch((err) => {
      logger.error('Failed to send waitlist notification', { userId: firstInLine.userId, error: err.message });
    });
  }

  async verifyBookingAccess(bookingId: string, userId: string): Promise<Booking> {
    const booking = await this.findById(bookingId);

    // User owns the booking
    if (booking.userId === userId) {
      return booking;
    }

    // User is center owner/staff
    try {
      await centersService.verifyOwnership(booking.centerId, userId);
      return booking;
    } catch {
      throw new ForbiddenError('Not authorized to access this booking');
    }
  }

  private mapToBooking(row: Record<string, unknown>): Booking {
    return {
      id: row.id as string,
      tripId: row.trip_id as string,
      userId: row.user_id as string,
      bookedByUserId: row.booked_by_user_id as string | undefined,
      centerId: row.center_id as string,
      bookingNumber: row.booking_number as string,
      status: row.status as Booking['status'],
      numberOfDivers: row.number_of_divers as number,
      basePriceSar: parseFloat(row.base_price_sar as string),
      equipmentRentalSar: parseFloat(row.equipment_rental_sar as string) || 0,
      conservationFeeSar: parseFloat(row.conservation_fee_sar as string) || 0,
      insuranceFeeSar: parseFloat(row.insurance_fee_sar as string) || 0,
      platformFeeSar: parseFloat(row.platform_fee_sar as string) || 0,
      vatAmountSar: parseFloat(row.vat_amount_sar as string) || 0,
      discountAmountSar: parseFloat(row.discount_amount_sar as string) || 0,
      totalAmountSar: parseFloat(row.total_amount_sar as string),
      currency: row.currency as string,
      specialRequests: row.special_requests as string | undefined,
      dietaryRequirements: row.dietary_requirements as string | undefined,
      equipmentSizes: row.equipment_sizes as EquipmentSizes | undefined,
      waiverSignedAt: row.waiver_signed_at as Date | undefined,
      waiverIpAddress: row.waiver_ip_address as string | undefined,
      parentConsentRequired: row.parent_consent_required as boolean,
      parentConsentGivenAt: row.parent_consent_given_at as Date | undefined,
      parentConsentBy: row.parent_consent_by as string | undefined,
      checkedInAt: row.checked_in_at as Date | undefined,
      checkedInBy: row.checked_in_by as string | undefined,
      cancellationReason: row.cancellation_reason as string | undefined,
      cancelledAt: row.cancelled_at as Date | undefined,
      cancelledBy: row.cancelled_by as string | undefined,
      refundAmountSar: row.refund_amount_sar ? parseFloat(row.refund_amount_sar as string) : undefined,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  private mapToBookingWithDetails(row: Record<string, unknown>): BookingWithDetails {
    return {
      ...this.mapToBooking(row),
      tripTitle: row.trip_title as string | undefined,
      userName: row.user_name as string | undefined,
      userEmail: row.user_email as string | undefined,
      centerName: row.center_name as string | undefined,
    };
  }
}

export const bookingsService = new BookingsService();
