import { db } from '../../config/database';
import { NotFoundError, ForbiddenError } from '../../utils/errors';
import { DivingCenter } from '../../types';
import { generateSlug } from '../../utils/helpers';

interface CreateCenterDto {
  nameEn: string;
  nameAr?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  srsaLicenseNumber?: string;
  city?: string;
  addressEn?: string;
  addressAr?: string;
  latitude?: number;
  longitude?: number;
  phoneEmergency?: string;
  email?: string;
  website?: string;
}

interface UpdateCenterDto extends Partial<CreateCenterDto> {}

export class CentersService {
  async findAll(options: {
    page?: number;
    limit?: number;
    city?: string;
    status?: string;
  }): Promise<{ centers: DivingCenter[]; total: number }> {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100);
    const offset = (page - 1) * limit;

    let whereClause = "WHERE dc.status = 'active'";
    const params: unknown[] = [];
    let paramIndex = 1;

    if (options.city) {
      whereClause += ` AND dc.city = $${paramIndex++}`;
      params.push(options.city);
    }

    const countResult = await db.query<{ count: string }>(
      `SELECT COUNT(*) FROM diving_centers dc ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const result = await db.query(
      `SELECT dc.* FROM diving_centers dc
       ${whereClause}
       ORDER BY dc.rating_average DESC, dc.total_reviews DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params
    );

    return {
      centers: result.rows.map(this.mapToCenter),
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  async findById(id: string): Promise<DivingCenter> {
    const result = await db.query('SELECT * FROM diving_centers WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Diving center');
    }

    return this.mapToCenter(result.rows[0]);
  }

  async create(ownerUserId: string, dto: CreateCenterDto): Promise<DivingCenter> {
    const slug = generateSlug(dto.nameEn);

    const result = await db.query<{ id: string }>(
      `INSERT INTO diving_centers (
        owner_user_id, name_en, name_ar, slug, description_en, description_ar,
        srsa_license_number, city, address_en, address_ar, latitude, longitude,
        phone_emergency, email, website, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'pending_verification')
      RETURNING id`,
      [
        ownerUserId,
        dto.nameEn,
        dto.nameAr,
        slug,
        dto.descriptionEn,
        dto.descriptionAr,
        dto.srsaLicenseNumber,
        dto.city,
        dto.addressEn,
        dto.addressAr,
        dto.latitude,
        dto.longitude,
        dto.phoneEmergency,
        dto.email,
        dto.website,
      ]
    );

    // Update user role to center_owner if not already
    await db.query(
      "UPDATE users SET role = 'center_owner' WHERE id = $1 AND role NOT IN ('admin', 'center_owner')",
      [ownerUserId]
    );

    return this.findById(result.rows[0].id);
  }

  async update(id: string, userId: string, dto: UpdateCenterDto): Promise<DivingCenter> {
    // Verify ownership
    await this.verifyOwnership(id, userId);

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, string> = {
      nameEn: 'name_en',
      nameAr: 'name_ar',
      descriptionEn: 'description_en',
      descriptionAr: 'description_ar',
      city: 'city',
      addressEn: 'address_en',
      addressAr: 'address_ar',
      latitude: 'latitude',
      longitude: 'longitude',
      phoneEmergency: 'phone_emergency',
      email: 'email',
      website: 'website',
    };

    for (const [key, dbField] of Object.entries(fieldMap)) {
      const value = dto[key as keyof UpdateCenterDto];
      if (value !== undefined) {
        updates.push(`${dbField} = $${paramIndex++}`);
        values.push(value);
      }
    }

    if (dto.nameEn) {
      updates.push(`slug = $${paramIndex++}`);
      values.push(generateSlug(dto.nameEn));
    }

    if (updates.length > 0) {
      values.push(id);
      await db.query(
        `UPDATE diving_centers SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`,
        values
      );
    }

    return this.findById(id);
  }

  async deactivate(id: string, userId: string): Promise<void> {
    await this.verifyOwnership(id, userId);

    await db.query(
      "UPDATE diving_centers SET status = 'deactivated', updated_at = NOW() WHERE id = $1",
      [id]
    );
  }

  async verifyOwnership(centerId: string, userId: string): Promise<void> {
    const result = await db.query(
      'SELECT id FROM diving_centers WHERE id = $1 AND owner_user_id = $2',
      [centerId, userId]
    );

    if (result.rows.length === 0) {
      // Check if admin
      const adminCheck = await db.query(
        "SELECT id FROM users WHERE id = $1 AND role = 'admin'",
        [userId]
      );

      if (adminCheck.rows.length === 0) {
        throw new ForbiddenError('Not authorized to manage this center');
      }
    }
  }

  private mapToCenter(row: Record<string, unknown>): DivingCenter {
    return {
      id: row.id as string,
      ownerUserId: row.owner_user_id as string,
      nameEn: row.name_en as string,
      nameAr: row.name_ar as string,
      slug: row.slug as string,
      srsaLicenseNumber: row.srsa_license_number as string,
      licenseExpiryDate: row.license_expiry_date as Date,
      city: row.city as string,
      latitude: row.latitude as number,
      longitude: row.longitude as number,
      phoneEmergency: row.phone_emergency as string,
      email: row.email as string,
      status: row.status as DivingCenter['status'],
      ratingAverage: parseFloat(row.rating_average as string) || 0,
      totalReviews: row.total_reviews as number,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }
}

export const centersService = new CentersService();
