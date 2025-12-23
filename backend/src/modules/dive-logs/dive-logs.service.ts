import { db } from '../../config/database';
import { NotFoundError, ForbiddenError, ValidationError } from '../../utils/errors';
import {
  DiveLog,
  DiveLogWithDetails,
  DiveStatistics,
  CreateDiveLogDto,
  UpdateDiveLogDto,
  DiveLogFilters,
  ImportComputerDataDto,
} from './dive-logs.types';

export class DiveLogsService {
  // ============================================================================
  // GET USER'S DIVE LOGS
  // ============================================================================

  async getUserDiveLogs(
    userId: string,
    filters: DiveLogFilters
  ): Promise<{ diveLogs: DiveLogWithDetails[]; total: number }> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const offset = (page - 1) * limit;

    const conditions: string[] = ['dl.user_id = $1'];
    const params: unknown[] = [userId];
    let paramIndex = 2;

    if (filters.siteId) {
      conditions.push(`dl.site_id = $${paramIndex++}`);
      params.push(filters.siteId);
    }

    if (filters.diveType) {
      conditions.push(`dl.dive_type = $${paramIndex++}`);
      params.push(filters.diveType);
    }

    if (filters.dateFrom) {
      conditions.push(`dl.dive_date >= $${paramIndex++}`);
      params.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      conditions.push(`dl.dive_date <= $${paramIndex++}`);
      params.push(filters.dateTo);
    }

    if (filters.minDepth !== undefined) {
      conditions.push(`dl.max_depth_meters >= $${paramIndex++}`);
      params.push(filters.minDepth);
    }

    if (filters.maxDepth !== undefined) {
      conditions.push(`dl.max_depth_meters <= $${paramIndex++}`);
      params.push(filters.maxDepth);
    }

    if (filters.verified !== undefined) {
      conditions.push(`dl.verified_by_instructor = $${paramIndex++}`);
      params.push(filters.verified);
    }

    // Determine sort order
    let orderBy = 'dl.dive_date DESC, dl.entry_time DESC';
    const order = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';
    switch (filters.sortBy) {
      case 'depth':
        orderBy = `dl.max_depth_meters ${order} NULLS LAST`;
        break;
      case 'duration':
        orderBy = `dl.bottom_time_minutes ${order} NULLS LAST`;
        break;
      case 'created':
        orderBy = `dl.created_at ${order}`;
        break;
      case 'date':
      default:
        orderBy = `dl.dive_date ${order}, dl.entry_time ${order}`;
    }

    const query = `
      SELECT
        dl.*,
        ds.name_en as site_name,
        ds.srsa_site_code as site_code,
        COALESCE(bdp.first_name_en || ' ' || bdp.last_name_en, dl.buddy_name) as buddy_user_name,
        COALESCE(idp.first_name_en || ' ' || idp.last_name_en, NULL) as instructor_name,
        t.title_en as trip_title
      FROM dive_logs dl
      LEFT JOIN dive_sites ds ON dl.site_id = ds.id
      LEFT JOIN diver_profiles bdp ON dl.buddy_user_id = bdp.user_id
      LEFT JOIN diver_profiles idp ON dl.instructor_id = idp.user_id
      LEFT JOIN trips t ON dl.trip_id = t.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    params.push(limit, offset);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM dive_logs dl
      WHERE ${conditions.join(' AND ')}
    `;

    const [logsResult, countResult] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, params.slice(0, paramIndex - 3)),
    ]);

    const diveLogs = logsResult.rows.map(this.mapRowToDiveLogWithDetails);
    const total = parseInt(countResult.rows[0].total, 10);

    return { diveLogs, total };
  }

  // ============================================================================
  // GET SINGLE DIVE LOG
  // ============================================================================

  async getDiveLogById(diveLogId: string, requestingUserId?: string): Promise<DiveLogWithDetails> {
    const query = `
      SELECT
        dl.*,
        ds.name_en as site_name,
        ds.srsa_site_code as site_code,
        COALESCE(bdp.first_name_en || ' ' || bdp.last_name_en, dl.buddy_name) as buddy_user_name,
        COALESCE(idp.first_name_en || ' ' || idp.last_name_en, NULL) as instructor_name,
        t.title_en as trip_title
      FROM dive_logs dl
      LEFT JOIN dive_sites ds ON dl.site_id = ds.id
      LEFT JOIN diver_profiles bdp ON dl.buddy_user_id = bdp.user_id
      LEFT JOIN diver_profiles idp ON dl.instructor_id = idp.user_id
      LEFT JOIN trips t ON dl.trip_id = t.id
      WHERE dl.id = $1
    `;

    const result = await db.query(query, [diveLogId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Dive log not found');
    }

    const diveLog = this.mapRowToDiveLogWithDetails(result.rows[0]);

    // Only the owner can view their dive logs (for now)
    if (requestingUserId && diveLog.userId !== requestingUserId) {
      throw new ForbiddenError('You do not have permission to view this dive log');
    }

    return diveLog;
  }

  // ============================================================================
  // GET USER'S DIVE STATISTICS
  // ============================================================================

  async getUserDiveStatistics(userId: string): Promise<DiveStatistics> {
    const statsQuery = `
      SELECT
        COUNT(*) as total_dives,
        COALESCE(SUM(bottom_time_minutes), 0) as total_bottom_time,
        COALESCE(MAX(max_depth_meters), 0) as deepest_dive,
        COALESCE(AVG(max_depth_meters), 0) as avg_depth,
        COALESCE(AVG(bottom_time_minutes), 0) as avg_bottom_time,
        COUNT(DISTINCT site_id) as total_sites,
        MAX(dive_date) as most_recent_dive,
        COUNT(*) FILTER (WHERE is_training_dive = TRUE) as certification_dives,
        COUNT(*) FILTER (WHERE dive_type = 'night') as night_dives,
        COUNT(*) FILTER (WHERE dive_type = 'deep' OR max_depth_meters > 30) as deep_dives
      FROM dive_logs
      WHERE user_id = $1
    `;

    const favoriteSiteQuery = `
      SELECT
        ds.id,
        ds.name_en as name,
        COUNT(*) as dive_count
      FROM dive_logs dl
      JOIN dive_sites ds ON dl.site_id = ds.id
      WHERE dl.user_id = $1
      GROUP BY ds.id, ds.name_en
      ORDER BY dive_count DESC
      LIMIT 1
    `;

    const divesByMonthQuery = `
      SELECT
        TO_CHAR(dive_date, 'YYYY-MM') as month,
        COUNT(*) as count
      FROM dive_logs
      WHERE user_id = $1 AND dive_date >= NOW() - INTERVAL '12 months'
      GROUP BY TO_CHAR(dive_date, 'YYYY-MM')
      ORDER BY month DESC
    `;

    const divesByYearQuery = `
      SELECT
        EXTRACT(YEAR FROM dive_date)::integer as year,
        COUNT(*) as count
      FROM dive_logs
      WHERE user_id = $1
      GROUP BY EXTRACT(YEAR FROM dive_date)
      ORDER BY year DESC
    `;

    const [statsResult, favoriteSiteResult, byMonthResult, byYearResult] = await Promise.all([
      db.query(statsQuery, [userId]),
      db.query(favoriteSiteQuery, [userId]),
      db.query(divesByMonthQuery, [userId]),
      db.query(divesByYearQuery, [userId]),
    ]);

    const stats = statsResult.rows[0];
    const favoriteSite = favoriteSiteResult.rows[0];

    return {
      totalDives: parseInt(stats.total_dives, 10),
      totalBottomTimeMinutes: parseInt(stats.total_bottom_time, 10),
      deepestDiveMeters: parseFloat(stats.deepest_dive) || 0,
      avgDepthMeters: parseFloat(stats.avg_depth) || 0,
      avgBottomTimeMinutes: parseFloat(stats.avg_bottom_time) || 0,
      totalSitesVisited: parseInt(stats.total_sites, 10),
      favoritesSite: favoriteSite
        ? {
            id: favoriteSite.id,
            name: favoriteSite.name,
            diveCount: parseInt(favoriteSite.dive_count, 10),
          }
        : null,
      mostRecentDive: stats.most_recent_dive,
      certificationDives: parseInt(stats.certification_dives, 10),
      nightDives: parseInt(stats.night_dives, 10),
      deepDives: parseInt(stats.deep_dives, 10),
      divesByMonth: byMonthResult.rows.map((row) => ({
        month: row.month,
        count: parseInt(row.count, 10),
      })),
      divesByYear: byYearResult.rows.map((row) => ({
        year: row.year,
        count: parseInt(row.count, 10),
      })),
    };
  }

  // ============================================================================
  // CREATE DIVE LOG
  // ============================================================================

  async createDiveLog(userId: string, dto: CreateDiveLogDto): Promise<DiveLog> {
    // Get user's next dive number if not provided
    let diveNumber = dto.diveNumber;
    if (!diveNumber) {
      const maxNumberResult = await db.query(
        'SELECT COALESCE(MAX(dive_number), 0) + 1 as next_number FROM dive_logs WHERE user_id = $1',
        [userId]
      );
      diveNumber = maxNumberResult.rows[0].next_number;
    }

    // Validate site exists if provided
    if (dto.siteId) {
      const siteCheck = await db.query('SELECT id FROM dive_sites WHERE id = $1', [dto.siteId]);
      if (siteCheck.rows.length === 0) {
        throw new ValidationError('Dive site not found');
      }
    }

    // Calculate air consumption rate if pressure data provided
    let airConsumptionRate: number | null = null;
    if (dto.startPressureBar && dto.endPressureBar && dto.bottomTimeMinutes && dto.avgDepthMeters) {
      const pressureUsed = dto.startPressureBar - dto.endPressureBar;
      const avgAbsolutePressure = (dto.avgDepthMeters / 10) + 1;
      airConsumptionRate = (pressureUsed / dto.bottomTimeMinutes) / avgAbsolutePressure;
    }

    const insertQuery = `
      INSERT INTO dive_logs (
        user_id, trip_id, booking_id, site_id, dive_number, dive_date,
        entry_time, exit_time, bottom_time_minutes, max_depth_meters, avg_depth_meters,
        water_temp_c, visibility_meters, weight_kg, suit_type, tank_type, tank_size_liters,
        start_pressure_bar, end_pressure_bar, air_consumption_rate, gas_mixture,
        dive_type, entry_type, current_conditions, weather_conditions,
        buddy_name, buddy_user_id, instructor_id, notes, marine_life_spotted,
        photos, computer_data, is_training_dive
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33
      )
      RETURNING *
    `;

    const result = await db.query(insertQuery, [
      userId,
      dto.tripId || null,
      dto.bookingId || null,
      dto.siteId || null,
      diveNumber,
      dto.diveDate,
      dto.entryTime || null,
      dto.exitTime || null,
      dto.bottomTimeMinutes || null,
      dto.maxDepthMeters || null,
      dto.avgDepthMeters || null,
      dto.waterTempC || null,
      dto.visibilityMeters || null,
      dto.weightKg || null,
      dto.suitType || null,
      dto.tankType || null,
      dto.tankSizeLiters || null,
      dto.startPressureBar || null,
      dto.endPressureBar || null,
      airConsumptionRate,
      dto.gasMixture || 'air',
      dto.diveType || null,
      dto.entryType || null,
      dto.currentConditions || null,
      dto.weatherConditions || null,
      dto.buddyName || null,
      dto.buddyUserId || null,
      dto.instructorId || null,
      dto.notes || null,
      dto.marineLifeSpotted || [],
      JSON.stringify(dto.photos || []),
      dto.computerData ? JSON.stringify(dto.computerData) : null,
      dto.isTrainingDive || false,
    ]);

    // Update diver profile stats
    await this.updateDiverProfileStats(userId);

    return this.mapRowToDiveLog(result.rows[0]);
  }

  // ============================================================================
  // UPDATE DIVE LOG
  // ============================================================================

  async updateDiveLog(
    userId: string,
    diveLogId: string,
    dto: UpdateDiveLogDto
  ): Promise<DiveLog> {
    // Verify ownership
    const existing = await this.getDiveLogById(diveLogId, userId);

    if (existing.verifiedByInstructor) {
      throw new ValidationError('Cannot modify a verified dive log');
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    const fieldMappings: Record<string, string> = {
      tripId: 'trip_id',
      bookingId: 'booking_id',
      siteId: 'site_id',
      diveNumber: 'dive_number',
      diveDate: 'dive_date',
      entryTime: 'entry_time',
      exitTime: 'exit_time',
      bottomTimeMinutes: 'bottom_time_minutes',
      maxDepthMeters: 'max_depth_meters',
      avgDepthMeters: 'avg_depth_meters',
      waterTempC: 'water_temp_c',
      visibilityMeters: 'visibility_meters',
      weightKg: 'weight_kg',
      suitType: 'suit_type',
      tankType: 'tank_type',
      tankSizeLiters: 'tank_size_liters',
      startPressureBar: 'start_pressure_bar',
      endPressureBar: 'end_pressure_bar',
      gasMixture: 'gas_mixture',
      diveType: 'dive_type',
      entryType: 'entry_type',
      currentConditions: 'current_conditions',
      weatherConditions: 'weather_conditions',
      buddyName: 'buddy_name',
      buddyUserId: 'buddy_user_id',
      instructorId: 'instructor_id',
      notes: 'notes',
      isTrainingDive: 'is_training_dive',
    };

    for (const [key, column] of Object.entries(fieldMappings)) {
      if (key in dto) {
        updates.push(`${column} = $${paramIndex++}`);
        params.push((dto as Record<string, unknown>)[key]);
      }
    }

    // Handle arrays specially
    if ('marineLifeSpotted' in dto) {
      updates.push(`marine_life_spotted = $${paramIndex++}`);
      params.push(dto.marineLifeSpotted);
    }

    if ('photos' in dto) {
      updates.push(`photos = $${paramIndex++}`);
      params.push(JSON.stringify(dto.photos));
    }

    if ('computerData' in dto) {
      updates.push(`computer_data = $${paramIndex++}`);
      params.push(dto.computerData ? JSON.stringify(dto.computerData) : null);
    }

    if (updates.length === 0) {
      return existing;
    }

    updates.push('updated_at = NOW()');
    params.push(diveLogId);

    const query = `
      UPDATE dive_logs
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, params);

    // Update diver profile stats
    await this.updateDiverProfileStats(userId);

    return this.mapRowToDiveLog(result.rows[0]);
  }

  // ============================================================================
  // DELETE DIVE LOG
  // ============================================================================

  async deleteDiveLog(userId: string, diveLogId: string): Promise<void> {
    // Verify ownership
    const existing = await this.getDiveLogById(diveLogId, userId);

    if (existing.verifiedByInstructor) {
      throw new ValidationError('Cannot delete a verified dive log');
    }

    await db.query('DELETE FROM dive_logs WHERE id = $1', [diveLogId]);

    // Update diver profile stats
    await this.updateDiverProfileStats(userId);
  }

  // ============================================================================
  // VERIFY DIVE LOG (Instructor)
  // ============================================================================

  async verifyDiveLog(
    instructorId: string,
    diveLogId: string,
    signatureUrl?: string
  ): Promise<DiveLog> {
    // Get the dive log
    const query = 'SELECT * FROM dive_logs WHERE id = $1';
    const result = await db.query(query, [diveLogId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Dive log not found');
    }

    const diveLog = result.rows[0];

    // Verify the instructor is the one assigned to this dive
    if (diveLog.instructor_id !== instructorId) {
      throw new ForbiddenError('You are not the assigned instructor for this dive');
    }

    if (diveLog.verified_by_instructor) {
      throw new ValidationError('This dive log is already verified');
    }

    const updateResult = await db.query(
      `UPDATE dive_logs
       SET verified_by_instructor = TRUE, signature_url = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [signatureUrl || null, diveLogId]
    );

    return this.mapRowToDiveLog(updateResult.rows[0]);
  }

  // ============================================================================
  // IMPORT FROM DIVE COMPUTER
  // ============================================================================

  async importFromComputer(
    userId: string,
    dto: ImportComputerDataDto
  ): Promise<{ imported: number; diveLogIds: string[] }> {
    const diveLogIds: string[] = [];

    // Get user's current max dive number
    const maxNumberResult = await db.query(
      'SELECT COALESCE(MAX(dive_number), 0) as max_number FROM dive_logs WHERE user_id = $1',
      [userId]
    );
    let currentDiveNumber = maxNumberResult.rows[0].max_number;

    for (const dive of dto.dives) {
      currentDiveNumber++;

      const computerData = {
        brand: dto.computerBrand,
        model: dto.computerModel,
        rawData: dive.rawData,
      };

      // Calculate air consumption rate if possible
      let airConsumptionRate: number | null = null;
      if (dive.startPressureBar && dive.endPressureBar && dive.bottomTimeMinutes && dive.avgDepthMeters) {
        const pressureUsed = dive.startPressureBar - dive.endPressureBar;
        const avgAbsolutePressure = (dive.avgDepthMeters / 10) + 1;
        airConsumptionRate = (pressureUsed / dive.bottomTimeMinutes) / avgAbsolutePressure;
      }

      const insertResult = await db.query(
        `INSERT INTO dive_logs (
          user_id, dive_number, dive_date, entry_time, exit_time,
          bottom_time_minutes, max_depth_meters, avg_depth_meters, water_temp_c,
          start_pressure_bar, end_pressure_bar, air_consumption_rate, gas_mixture,
          computer_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id`,
        [
          userId,
          currentDiveNumber,
          dive.diveDate,
          dive.entryTime || null,
          dive.exitTime || null,
          dive.bottomTimeMinutes,
          dive.maxDepthMeters,
          dive.avgDepthMeters || null,
          dive.waterTempC || null,
          dive.startPressureBar || null,
          dive.endPressureBar || null,
          airConsumptionRate,
          dive.gasMixture || 'air',
          JSON.stringify(computerData),
        ]
      );

      diveLogIds.push(insertResult.rows[0].id);
    }

    // Update diver profile stats
    await this.updateDiverProfileStats(userId);

    return { imported: diveLogIds.length, diveLogIds };
  }

  // ============================================================================
  // GET DIVES FOR TRIP (for linking)
  // ============================================================================

  async getDivesForTrip(tripId: string): Promise<DiveLog[]> {
    const query = `
      SELECT * FROM dive_logs WHERE trip_id = $1 ORDER BY dive_date, entry_time
    `;

    const result = await db.query(query, [tripId]);
    return result.rows.map(this.mapRowToDiveLog);
  }

  // ============================================================================
  // HELPER: Update diver profile statistics
  // ============================================================================

  private async updateDiverProfileStats(userId: string): Promise<void> {
    const statsQuery = `
      SELECT
        COUNT(*) as total_logged_dives,
        COALESCE(MAX(max_depth_meters), 0) as deepest_dive_meters
      FROM dive_logs
      WHERE user_id = $1
    `;

    const stats = await db.query(statsQuery, [userId]);

    await db.query(
      `UPDATE diver_profiles
       SET total_logged_dives = $1, deepest_dive_meters = $2, updated_at = NOW()
       WHERE user_id = $3`,
      [
        parseInt(stats.rows[0].total_logged_dives, 10),
        parseFloat(stats.rows[0].deepest_dive_meters) || null,
        userId,
      ]
    );
  }

  // ============================================================================
  // HELPER: Map database row to DiveLog
  // ============================================================================

  private mapRowToDiveLog(row: Record<string, unknown>): DiveLog {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      tripId: row.trip_id as string | null,
      bookingId: row.booking_id as string | null,
      siteId: row.site_id as string | null,
      diveNumber: row.dive_number as number | null,
      diveDate: row.dive_date as string,
      entryTime: row.entry_time as string | null,
      exitTime: row.exit_time as string | null,
      bottomTimeMinutes: row.bottom_time_minutes as number | null,
      maxDepthMeters: row.max_depth_meters ? parseFloat(row.max_depth_meters as string) : null,
      avgDepthMeters: row.avg_depth_meters ? parseFloat(row.avg_depth_meters as string) : null,
      waterTempC: row.water_temp_c as number | null,
      visibilityMeters: row.visibility_meters as number | null,
      weightKg: row.weight_kg ? parseFloat(row.weight_kg as string) : null,
      suitType: row.suit_type as DiveLog['suitType'],
      tankType: row.tank_type as DiveLog['tankType'],
      tankSizeLiters: row.tank_size_liters as number | null,
      startPressureBar: row.start_pressure_bar as number | null,
      endPressureBar: row.end_pressure_bar as number | null,
      airConsumptionRate: row.air_consumption_rate ? parseFloat(row.air_consumption_rate as string) : null,
      gasMixture: (row.gas_mixture as DiveLog['gasMixture']) || 'air',
      diveType: row.dive_type as DiveLog['diveType'],
      entryType: row.entry_type as DiveLog['entryType'],
      currentConditions: row.current_conditions as DiveLog['currentConditions'],
      weatherConditions: row.weather_conditions as DiveLog['weatherConditions'],
      buddyName: row.buddy_name as string | null,
      buddyUserId: row.buddy_user_id as string | null,
      instructorId: row.instructor_id as string | null,
      notes: row.notes as string | null,
      marineLifeSpotted: (row.marine_life_spotted as string[]) || [],
      photos: (row.photos as string[]) || [],
      computerData: row.computer_data as Record<string, unknown> | null,
      isTrainingDive: row.is_training_dive as boolean,
      signatureUrl: row.signature_url as string | null,
      verifiedByInstructor: row.verified_by_instructor as boolean,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private mapRowToDiveLogWithDetails(row: Record<string, unknown>): DiveLogWithDetails {
    return {
      ...this.mapRowToDiveLog(row),
      siteName: row.site_name as string | null,
      siteCode: row.site_code as string | null,
      buddyUserName: row.buddy_user_name as string | null,
      instructorName: row.instructor_name as string | null,
      tripTitle: row.trip_title as string | null,
    };
  }
}

export const diveLogsService = new DiveLogsService();
