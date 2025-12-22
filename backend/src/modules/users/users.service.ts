import { db } from '../../config/database';
import { NotFoundError } from '../../utils/errors';
import { User, DiverProfile } from '../../types';

interface UserWithProfile extends User {
  profile?: DiverProfile;
}

interface UpdateUserDto {
  phoneNumber?: string;
  preferredLanguage?: string;
}

export class UsersService {
  async findById(id: string): Promise<UserWithProfile> {
    const result = await db.query<{
      id: string;
      email: string;
      phone_number: string;
      role: string;
      status: string;
      preferred_language: string;
      email_verified_at: Date;
      last_login_at: Date;
      created_at: Date;
      updated_at: Date;
      profile_id: string;
      first_name_en: string;
      first_name_ar: string;
      last_name_en: string;
      last_name_ar: string;
      date_of_birth: Date;
      nationality: string;
      experience_level: string;
      total_logged_dives: number;
      is_minor: boolean;
      emergency_contact_name: string;
      emergency_contact_phone: string;
    }>(
      `SELECT u.*, dp.id as profile_id, dp.first_name_en, dp.first_name_ar,
              dp.last_name_en, dp.last_name_ar, dp.date_of_birth, dp.nationality,
              dp.experience_level, dp.total_logged_dives, dp.is_minor,
              dp.emergency_contact_name, dp.emergency_contact_phone
       FROM users u
       LEFT JOIN diver_profiles dp ON dp.user_id = u.id
       WHERE u.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User');
    }

    const row = result.rows[0];
    return this.mapToUserWithProfile(row);
  }

  async findByEmail(email: string): Promise<UserWithProfile | null> {
    const result = await db.query(
      `SELECT u.*, dp.id as profile_id, dp.first_name_en, dp.last_name_en, dp.is_minor
       FROM users u
       LEFT JOIN diver_profiles dp ON dp.user_id = u.id
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToUserWithProfile(result.rows[0]);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserWithProfile> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (dto.phoneNumber !== undefined) {
      updates.push(`phone_number = $${paramIndex++}`);
      values.push(dto.phoneNumber);
    }

    if (dto.preferredLanguage !== undefined) {
      updates.push(`preferred_language = $${paramIndex++}`);
      values.push(dto.preferredLanguage);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    await db.query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`,
      values
    );

    return this.findById(id);
  }

  async deactivate(id: string): Promise<void> {
    await db.query(
      `UPDATE users SET status = 'deactivated', updated_at = NOW() WHERE id = $1`,
      [id]
    );
  }

  private mapToUserWithProfile(row: Record<string, unknown>): UserWithProfile {
    const user: UserWithProfile = {
      id: row.id as string,
      email: row.email as string,
      phoneNumber: row.phone_number as string,
      role: row.role as User['role'],
      status: row.status as User['status'],
      preferredLanguage: row.preferred_language as string,
      emailVerifiedAt: row.email_verified_at as Date,
      lastLoginAt: row.last_login_at as Date,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };

    if (row.profile_id) {
      user.profile = {
        id: row.profile_id as string,
        userId: row.id as string,
        firstNameEn: row.first_name_en as string,
        firstNameAr: row.first_name_ar as string,
        lastNameEn: row.last_name_en as string,
        lastNameAr: row.last_name_ar as string,
        dateOfBirth: row.date_of_birth as Date,
        nationality: row.nationality as string,
        experienceLevel: row.experience_level as string,
        totalLoggedDives: row.total_logged_dives as number,
        isMinor: row.is_minor as boolean,
        emergencyContactName: row.emergency_contact_name as string,
        emergencyContactPhone: row.emergency_contact_phone as string,
        createdAt: row.created_at as Date,
        updatedAt: row.updated_at as Date,
      };
    }

    return user;
  }
}

export const usersService = new UsersService();
