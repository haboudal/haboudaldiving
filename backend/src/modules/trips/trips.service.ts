import { db } from '../../config/database';
import { NotFoundError, ForbiddenError, ValidationError } from '../../utils/errors';
import { centersService } from '../centers/centers.service';
import {
  Trip,
  TripWithDetails,
  TripInstructor,
  TripStatus,
  CreateTripDto,
  UpdateTripDto,
  TripFilters,
  AddInstructorDto,
} from './trips.types';

export class TripsService {
  async findAll(filters: TripFilters): Promise<{ trips: TripWithDetails[]; total: number }> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    // Only show published trips to public, or all trips for specific center queries
    if (filters.status) {
      conditions.push(`t.status = $${paramIndex++}`);
      params.push(filters.status);
    } else if (!filters.centerId) {
      conditions.push(`t.status = 'published'`);
    }

    if (filters.centerId) {
      conditions.push(`t.center_id = $${paramIndex++}`);
      params.push(filters.centerId);
    }

    if (filters.siteId) {
      conditions.push(`t.site_id = $${paramIndex++}`);
      params.push(filters.siteId);
    }

    if (filters.tripType) {
      conditions.push(`t.trip_type = $${paramIndex++}`);
      params.push(filters.tripType);
    }

    if (filters.dateFrom) {
      conditions.push(`t.departure_datetime >= $${paramIndex++}`);
      params.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      conditions.push(`t.departure_datetime <= $${paramIndex++}`);
      params.push(filters.dateTo);
    }

    if (filters.upcoming) {
      conditions.push(`t.departure_datetime > NOW()`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await db.query<{ count: string }>(
      `SELECT COUNT(*) FROM trips t ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const result = await db.query(
      `SELECT t.*,
        dc.name_en AS center_name,
        ds.name_en AS site_name,
        u.first_name || ' ' || u.last_name AS lead_instructor_name,
        v.name AS vessel_name
      FROM trips t
      LEFT JOIN diving_centers dc ON t.center_id = dc.id
      LEFT JOIN dive_sites ds ON t.site_id = ds.id
      LEFT JOIN users u ON t.lead_instructor_id = u.id
      LEFT JOIN vessels v ON t.vessel_id = v.id
      ${whereClause}
      ORDER BY t.departure_datetime ASC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params
    );

    return {
      trips: result.rows.map(this.mapToTripWithDetails),
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  async findById(tripId: string): Promise<TripWithDetails> {
    const result = await db.query(
      `SELECT t.*,
        dc.name_en AS center_name,
        ds.name_en AS site_name,
        u.first_name || ' ' || u.last_name AS lead_instructor_name,
        v.name AS vessel_name
      FROM trips t
      LEFT JOIN diving_centers dc ON t.center_id = dc.id
      LEFT JOIN dive_sites ds ON t.site_id = ds.id
      LEFT JOIN users u ON t.lead_instructor_id = u.id
      LEFT JOIN vessels v ON t.vessel_id = v.id
      WHERE t.id = $1`,
      [tripId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Trip');
    }

    return this.mapToTripWithDetails(result.rows[0]);
  }

  async create(centerId: string, userId: string, dto: CreateTripDto): Promise<Trip> {
    // Verify user owns the center
    await centersService.verifyOwnership(centerId, userId);

    const result = await db.query<{ id: string }>(
      `INSERT INTO trips (
        center_id, vessel_id, site_id, lead_instructor_id,
        title_en, title_ar, description_en, description_ar,
        trip_type, departure_datetime, return_datetime,
        meeting_point_en, meeting_point_ar,
        meeting_point_latitude, meeting_point_longitude,
        max_participants, min_participants,
        min_certification_level, min_logged_dives, min_age, max_age,
        number_of_dives, includes_equipment, includes_meals, includes_refreshments,
        price_per_person_sar, equipment_rental_price_sar,
        conservation_fee_included, cancellation_policy, cancellation_deadline_hours,
        status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, 'draft'
      ) RETURNING id`,
      [
        centerId,
        dto.vesselId || null,
        dto.siteId || null,
        dto.leadInstructorId || null,
        dto.titleEn,
        dto.titleAr || null,
        dto.descriptionEn || null,
        dto.descriptionAr || null,
        dto.tripType,
        dto.departureDatetime,
        dto.returnDatetime,
        dto.meetingPointEn || null,
        dto.meetingPointAr || null,
        dto.meetingPointLatitude || null,
        dto.meetingPointLongitude || null,
        dto.maxParticipants,
        dto.minParticipants || 1,
        dto.minCertificationLevel || null,
        dto.minLoggedDives || 0,
        dto.minAge || 10,
        dto.maxAge || null,
        dto.numberOfDives || 2,
        dto.includesEquipment || false,
        dto.includesMeals || false,
        dto.includesRefreshments !== false,
        dto.pricePerPersonSar,
        dto.equipmentRentalPriceSar || null,
        dto.conservationFeeIncluded || false,
        dto.cancellationPolicy || null,
        dto.cancellationDeadlineHours || 24,
      ]
    );

    return this.findById(result.rows[0].id);
  }

  async update(tripId: string, userId: string, dto: UpdateTripDto): Promise<Trip> {
    const trip = await this.findById(tripId);
    await centersService.verifyOwnership(trip.centerId, userId);

    // Cannot update cancelled or completed trips
    if (trip.status === 'cancelled' || trip.status === 'completed') {
      throw new ValidationError(`Cannot update a ${trip.status} trip`);
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, string> = {
      vesselId: 'vessel_id',
      siteId: 'site_id',
      leadInstructorId: 'lead_instructor_id',
      titleEn: 'title_en',
      titleAr: 'title_ar',
      descriptionEn: 'description_en',
      descriptionAr: 'description_ar',
      tripType: 'trip_type',
      departureDatetime: 'departure_datetime',
      returnDatetime: 'return_datetime',
      meetingPointEn: 'meeting_point_en',
      meetingPointAr: 'meeting_point_ar',
      meetingPointLatitude: 'meeting_point_latitude',
      meetingPointLongitude: 'meeting_point_longitude',
      maxParticipants: 'max_participants',
      minParticipants: 'min_participants',
      minCertificationLevel: 'min_certification_level',
      minLoggedDives: 'min_logged_dives',
      minAge: 'min_age',
      maxAge: 'max_age',
      numberOfDives: 'number_of_dives',
      includesEquipment: 'includes_equipment',
      includesMeals: 'includes_meals',
      includesRefreshments: 'includes_refreshments',
      pricePerPersonSar: 'price_per_person_sar',
      equipmentRentalPriceSar: 'equipment_rental_price_sar',
      conservationFeeIncluded: 'conservation_fee_included',
      cancellationPolicy: 'cancellation_policy',
      cancellationDeadlineHours: 'cancellation_deadline_hours',
    };

    for (const [key, dbField] of Object.entries(fieldMap)) {
      const value = dto[key as keyof UpdateTripDto];
      if (value !== undefined) {
        updates.push(`${dbField} = $${paramIndex++}`);
        values.push(value);
      }
    }

    if (updates.length > 0) {
      values.push(tripId);
      await db.query(
        `UPDATE trips SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`,
        values
      );
    }

    return this.findById(tripId);
  }

  async publish(tripId: string, userId: string): Promise<Trip> {
    const trip = await this.findById(tripId);
    await centersService.verifyOwnership(trip.centerId, userId);

    if (trip.status !== 'draft') {
      throw new ValidationError(`Cannot publish a trip with status: ${trip.status}`);
    }

    // Validate required fields for publishing
    if (!trip.siteId) {
      throw new ValidationError('Trip must have a dive site assigned before publishing');
    }

    await db.query(
      `UPDATE trips SET status = 'published', published_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [tripId]
    );

    return this.findById(tripId);
  }

  async cancel(tripId: string, userId: string, reason?: string): Promise<void> {
    const trip = await this.findById(tripId);
    await centersService.verifyOwnership(trip.centerId, userId);

    if (trip.status === 'cancelled' || trip.status === 'completed') {
      throw new ValidationError(`Trip is already ${trip.status}`);
    }

    // Cancel the trip
    await db.query(
      `UPDATE trips SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
      [tripId]
    );

    // Cancel all pending/confirmed bookings for this trip
    await db.query(
      `UPDATE bookings
       SET status = 'cancelled',
           cancellation_reason = $2,
           cancelled_at = NOW(),
           updated_at = NOW()
       WHERE trip_id = $1 AND status IN ('pending', 'confirmed', 'paid')`,
      [tripId, reason || 'Trip was cancelled by the center']
    );
  }

  async delete(tripId: string, userId: string): Promise<void> {
    const trip = await this.findById(tripId);
    await centersService.verifyOwnership(trip.centerId, userId);

    // Only allow deletion of draft trips with no bookings
    if (trip.status !== 'draft') {
      throw new ValidationError('Only draft trips can be deleted. Cancel the trip instead.');
    }

    const bookingCheck = await db.query(
      'SELECT COUNT(*) FROM bookings WHERE trip_id = $1',
      [tripId]
    );

    if (parseInt(bookingCheck.rows[0].count, 10) > 0) {
      throw new ValidationError('Cannot delete trip with existing bookings');
    }

    await db.query('DELETE FROM trips WHERE id = $1', [tripId]);
  }

  async addInstructor(tripId: string, userId: string, dto: AddInstructorDto): Promise<TripInstructor> {
    const trip = await this.findById(tripId);
    await centersService.verifyOwnership(trip.centerId, userId);

    // Verify instructor exists and is actually an instructor
    const instructorCheck = await db.query(
      `SELECT id FROM users WHERE id = $1 AND role IN ('instructor', 'center_owner', 'center_staff')`,
      [dto.instructorId]
    );

    if (instructorCheck.rows.length === 0) {
      throw new NotFoundError('Instructor');
    }

    // Check if already assigned
    const existing = await db.query(
      'SELECT id FROM trip_instructors WHERE trip_id = $1 AND instructor_id = $2',
      [tripId, dto.instructorId]
    );

    if (existing.rows.length > 0) {
      throw new ValidationError('Instructor is already assigned to this trip');
    }

    const result = await db.query<{ id: string; created_at: Date }>(
      `INSERT INTO trip_instructors (trip_id, instructor_id, role)
       VALUES ($1, $2, $3)
       RETURNING id, created_at`,
      [tripId, dto.instructorId, dto.role || 'assistant']
    );

    return {
      id: result.rows[0].id,
      tripId,
      instructorId: dto.instructorId,
      role: dto.role || 'assistant',
      createdAt: result.rows[0].created_at,
    };
  }

  async removeInstructor(tripId: string, instructorId: string, userId: string): Promise<void> {
    const trip = await this.findById(tripId);
    await centersService.verifyOwnership(trip.centerId, userId);

    const result = await db.query(
      'DELETE FROM trip_instructors WHERE trip_id = $1 AND instructor_id = $2',
      [tripId, instructorId]
    );

    if (result.rowCount === 0) {
      throw new NotFoundError('Trip instructor assignment');
    }
  }

  async getInstructors(tripId: string): Promise<TripInstructor[]> {
    const result = await db.query(
      `SELECT ti.*, u.first_name || ' ' || u.last_name AS instructor_name
       FROM trip_instructors ti
       JOIN users u ON ti.instructor_id = u.id
       WHERE ti.trip_id = $1
       ORDER BY ti.role = 'lead' DESC, ti.created_at ASC`,
      [tripId]
    );

    return result.rows.map((row) => ({
      id: row.id as string,
      tripId: row.trip_id as string,
      instructorId: row.instructor_id as string,
      instructorName: row.instructor_name as string,
      role: row.role as TripInstructor['role'],
      createdAt: row.created_at as Date,
    }));
  }

  async updateStatusIfFull(tripId: string): Promise<void> {
    await db.query(
      `UPDATE trips
       SET status = CASE
         WHEN current_participants >= max_participants AND status = 'published' THEN 'full'::trip_status
         WHEN current_participants < max_participants AND status = 'full' THEN 'published'::trip_status
         ELSE status
       END,
       updated_at = NOW()
       WHERE id = $1 AND status IN ('published', 'full')`,
      [tripId]
    );
  }

  async verifyTripAccess(tripId: string, userId: string): Promise<Trip> {
    const trip = await this.findById(tripId);
    await centersService.verifyOwnership(trip.centerId, userId);
    return trip;
  }

  private mapToTrip(row: Record<string, unknown>): Trip {
    return {
      id: row.id as string,
      centerId: row.center_id as string,
      vesselId: row.vessel_id as string | undefined,
      siteId: row.site_id as string | undefined,
      leadInstructorId: row.lead_instructor_id as string | undefined,
      titleEn: row.title_en as string,
      titleAr: row.title_ar as string | undefined,
      descriptionEn: row.description_en as string | undefined,
      descriptionAr: row.description_ar as string | undefined,
      tripType: row.trip_type as Trip['tripType'],
      departureDatetime: row.departure_datetime as Date,
      returnDatetime: row.return_datetime as Date,
      meetingPointEn: row.meeting_point_en as string | undefined,
      meetingPointAr: row.meeting_point_ar as string | undefined,
      meetingPointLatitude: row.meeting_point_latitude ? parseFloat(row.meeting_point_latitude as string) : undefined,
      meetingPointLongitude: row.meeting_point_longitude ? parseFloat(row.meeting_point_longitude as string) : undefined,
      maxParticipants: row.max_participants as number,
      minParticipants: row.min_participants as number,
      currentParticipants: row.current_participants as number,
      minCertificationLevel: row.min_certification_level as string | undefined,
      minLoggedDives: row.min_logged_dives as number,
      minAge: row.min_age as number,
      maxAge: row.max_age as number | undefined,
      numberOfDives: row.number_of_dives as number,
      includesEquipment: row.includes_equipment as boolean,
      includesMeals: row.includes_meals as boolean,
      includesRefreshments: row.includes_refreshments as boolean,
      pricePerPersonSar: parseFloat(row.price_per_person_sar as string),
      equipmentRentalPriceSar: row.equipment_rental_price_sar ? parseFloat(row.equipment_rental_price_sar as string) : undefined,
      conservationFeeIncluded: row.conservation_fee_included as boolean,
      cancellationPolicy: row.cancellation_policy as string | undefined,
      cancellationDeadlineHours: row.cancellation_deadline_hours as number,
      quotaReservationId: row.quota_reservation_id as string | undefined,
      status: row.status as TripStatus,
      publishedAt: row.published_at as Date | undefined,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  private mapToTripWithDetails(row: Record<string, unknown>): TripWithDetails {
    return {
      ...this.mapToTrip(row),
      centerName: row.center_name as string | undefined,
      siteName: row.site_name as string | undefined,
      leadInstructorName: row.lead_instructor_name as string | undefined,
      vesselName: row.vessel_name as string | undefined,
    };
  }
}

export const tripsService = new TripsService();
