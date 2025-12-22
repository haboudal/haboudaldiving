import { db } from '../../config/database';
import { NotFoundError } from '../../utils/errors';

interface InstructorProfile {
  id: string;
  userId: string;
  instructorNumber?: string;
  certificationAgency: string;
  instructorLevel: string;
  specialties: string[];
  languagesSpoken: string[];
  yearsExperience: number;
  isIndependent: boolean;
  bioEn?: string;
  bioAr?: string;
  hourlyRateSar?: number;
  dailyRateSar?: number;
  ratingAverage: number;
  totalReviews: number;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface UpdateInstructorDto {
  instructorNumber?: string;
  certificationAgency?: string;
  instructorLevel?: string;
  specialties?: string[];
  languagesSpoken?: string[];
  yearsExperience?: number;
  bioEn?: string;
  bioAr?: string;
  hourlyRateSar?: number;
  dailyRateSar?: number;
}

export class InstructorsService {
  async findAll(options: { page?: number; limit?: number; city?: string }): Promise<{
    instructors: InstructorProfile[];
    total: number;
  }> {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100);
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE ip.verified_at IS NOT NULL';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (options.city) {
      whereClause += ` AND dc.city = $${paramIndex++}`;
      params.push(options.city);
    }

    const countResult = await db.query<{ count: string }>(
      `SELECT COUNT(*) FROM instructor_profiles ip
       LEFT JOIN diving_centers dc ON dc.owner_user_id = ip.user_id
       ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const result = await db.query(
      `SELECT ip.*, u.email FROM instructor_profiles ip
       JOIN users u ON u.id = ip.user_id
       LEFT JOIN diving_centers dc ON dc.owner_user_id = ip.user_id
       ${whereClause}
       ORDER BY ip.rating_average DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params
    );

    return {
      instructors: result.rows.map(this.mapToInstructor),
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  async findById(id: string): Promise<InstructorProfile> {
    const result = await db.query(
      `SELECT ip.*, u.email FROM instructor_profiles ip
       JOIN users u ON u.id = ip.user_id
       WHERE ip.user_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Instructor');
    }

    return this.mapToInstructor(result.rows[0]);
  }

  async update(userId: string, dto: UpdateInstructorDto): Promise<InstructorProfile> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, string> = {
      instructorNumber: 'instructor_number',
      certificationAgency: 'certification_agency',
      instructorLevel: 'instructor_level',
      specialties: 'specialties',
      languagesSpoken: 'languages_spoken',
      yearsExperience: 'years_experience',
      bioEn: 'bio_en',
      bioAr: 'bio_ar',
      hourlyRateSar: 'hourly_rate_sar',
      dailyRateSar: 'daily_rate_sar',
    };

    for (const [key, dbField] of Object.entries(fieldMap)) {
      const value = dto[key as keyof UpdateInstructorDto];
      if (value !== undefined) {
        if (key === 'specialties') {
          updates.push(`${dbField} = $${paramIndex++}::jsonb`);
          values.push(JSON.stringify(value));
        } else if (key === 'languagesSpoken') {
          updates.push(`${dbField} = $${paramIndex++}`);
          values.push(value);
        } else {
          updates.push(`${dbField} = $${paramIndex++}`);
          values.push(value);
        }
      }
    }

    if (updates.length > 0) {
      values.push(userId);
      await db.query(
        `UPDATE instructor_profiles SET ${updates.join(', ')}, updated_at = NOW() WHERE user_id = $${paramIndex}`,
        values
      );
    }

    return this.findById(userId);
  }

  async getSchedule(userId: string): Promise<Record<string, unknown>> {
    const result = await db.query<{ availability_calendar: Record<string, unknown> }>(
      'SELECT availability_calendar FROM instructor_profiles WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Instructor');
    }

    return result.rows[0].availability_calendar || {};
  }

  async updateSchedule(userId: string, schedule: Record<string, unknown>): Promise<Record<string, unknown>> {
    await db.query(
      'UPDATE instructor_profiles SET availability_calendar = $1, updated_at = NOW() WHERE user_id = $2',
      [JSON.stringify(schedule), userId]
    );

    return schedule;
  }

  private mapToInstructor(row: Record<string, unknown>): InstructorProfile {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      instructorNumber: row.instructor_number as string,
      certificationAgency: row.certification_agency as string,
      instructorLevel: row.instructor_level as string,
      specialties: (row.specialties as string[]) || [],
      languagesSpoken: (row.languages_spoken as string[]) || [],
      yearsExperience: row.years_experience as number,
      isIndependent: row.is_independent as boolean,
      bioEn: row.bio_en as string,
      bioAr: row.bio_ar as string,
      hourlyRateSar: row.hourly_rate_sar as number,
      dailyRateSar: row.daily_rate_sar as number,
      ratingAverage: row.rating_average as number,
      totalReviews: row.total_reviews as number,
      verifiedAt: row.verified_at as Date,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }
}

export const instructorsService = new InstructorsService();
