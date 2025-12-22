import { db } from '../../../config/database';
import { NotFoundError, ConflictError } from '../../../utils/errors';
import { centersService } from '../centers.service';

interface StaffMember {
  id: string;
  centerId: string;
  userId: string;
  userEmail: string;
  userName: string;
  role: string;
  titleEn?: string;
  titleAr?: string;
  permissions: string[];
  employmentType?: string;
  isActive: boolean;
  hiredAt?: Date;
  createdAt: Date;
}

interface AddStaffDto {
  userEmail: string;
  role: string;
  titleEn?: string;
  titleAr?: string;
  permissions?: string[];
  employmentType?: string;
}

interface UpdateStaffDto {
  role?: string;
  titleEn?: string;
  titleAr?: string;
  permissions?: string[];
  isActive?: boolean;
}

export class StaffService {
  async findByCenter(centerId: string): Promise<StaffMember[]> {
    const result = await db.query(
      `SELECT cs.*, u.email as user_email, dp.first_name_en, dp.last_name_en
       FROM center_staff cs
       JOIN users u ON u.id = cs.user_id
       LEFT JOIN diver_profiles dp ON dp.user_id = cs.user_id
       WHERE cs.center_id = $1 AND cs.is_active = true
       ORDER BY cs.created_at`,
      [centerId]
    );

    return result.rows.map(this.mapToStaff);
  }

  async addStaff(centerId: string, ownerId: string, dto: AddStaffDto): Promise<StaffMember> {
    await centersService.verifyOwnership(centerId, ownerId);

    // Find user by email
    const userResult = await db.query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1',
      [dto.userEmail.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      throw new NotFoundError('User with this email');
    }

    const userId = userResult.rows[0].id;

    // Check if already staff
    const existingStaff = await db.query(
      'SELECT id FROM center_staff WHERE center_id = $1 AND user_id = $2',
      [centerId, userId]
    );

    if (existingStaff.rows.length > 0) {
      throw new ConflictError('User is already a staff member');
    }

    const result = await db.query<{ id: string }>(
      `INSERT INTO center_staff (center_id, user_id, role, title_en, title_ar, permissions, employment_type, hired_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id`,
      [
        centerId,
        userId,
        dto.role,
        dto.titleEn,
        dto.titleAr,
        JSON.stringify(dto.permissions || []),
        dto.employmentType,
      ]
    );

    // Update user role
    await db.query(
      "UPDATE users SET role = 'center_staff' WHERE id = $1 AND role = 'diver'",
      [userId]
    );

    return this.findById(centerId, result.rows[0].id);
  }

  async findById(centerId: string, staffId: string): Promise<StaffMember> {
    const result = await db.query(
      `SELECT cs.*, u.email as user_email, dp.first_name_en, dp.last_name_en
       FROM center_staff cs
       JOIN users u ON u.id = cs.user_id
       LEFT JOIN diver_profiles dp ON dp.user_id = cs.user_id
       WHERE cs.id = $1 AND cs.center_id = $2`,
      [staffId, centerId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Staff member');
    }

    return this.mapToStaff(result.rows[0]);
  }

  async updateStaff(
    centerId: string,
    staffId: string,
    ownerId: string,
    dto: UpdateStaffDto
  ): Promise<StaffMember> {
    await centersService.verifyOwnership(centerId, ownerId);

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (dto.role !== undefined) {
      updates.push(`role = $${paramIndex++}`);
      values.push(dto.role);
    }
    if (dto.titleEn !== undefined) {
      updates.push(`title_en = $${paramIndex++}`);
      values.push(dto.titleEn);
    }
    if (dto.titleAr !== undefined) {
      updates.push(`title_ar = $${paramIndex++}`);
      values.push(dto.titleAr);
    }
    if (dto.permissions !== undefined) {
      updates.push(`permissions = $${paramIndex++}`);
      values.push(JSON.stringify(dto.permissions));
    }
    if (dto.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(dto.isActive);
    }

    if (updates.length > 0) {
      values.push(staffId, centerId);
      await db.query(
        `UPDATE center_staff SET ${updates.join(', ')}, updated_at = NOW()
         WHERE id = $${paramIndex++} AND center_id = $${paramIndex}`,
        values
      );
    }

    return this.findById(centerId, staffId);
  }

  async removeStaff(centerId: string, staffId: string, ownerId: string): Promise<void> {
    await centersService.verifyOwnership(centerId, ownerId);

    const result = await db.query(
      "UPDATE center_staff SET is_active = false, terminated_at = NOW(), updated_at = NOW() WHERE id = $1 AND center_id = $2",
      [staffId, centerId]
    );

    if (result.rowCount === 0) {
      throw new NotFoundError('Staff member');
    }
  }

  private mapToStaff(row: Record<string, unknown>): StaffMember {
    return {
      id: row.id as string,
      centerId: row.center_id as string,
      userId: row.user_id as string,
      userEmail: row.user_email as string,
      userName: `${row.first_name_en || ''} ${row.last_name_en || ''}`.trim(),
      role: row.role as string,
      titleEn: row.title_en as string,
      titleAr: row.title_ar as string,
      permissions: (row.permissions as string[]) || [],
      employmentType: row.employment_type as string,
      isActive: row.is_active as boolean,
      hiredAt: row.hired_at as Date,
      createdAt: row.created_at as Date,
    };
  }
}

export const staffService = new StaffService();
