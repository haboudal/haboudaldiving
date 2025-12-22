import { db } from '../../config/database';
import { NotFoundError } from '../../utils/errors';
import { DiverProfile, Certification } from '../../types';

interface UpdateDiverProfileDto {
  firstNameEn?: string;
  firstNameAr?: string;
  lastNameEn?: string;
  lastNameAr?: string;
  dateOfBirth?: string;
  nationality?: string;
  experienceLevel?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
}

interface AddCertificationDto {
  agency: string;
  certificationType: string;
  certificationNumber?: string;
  certificationLevel?: string;
  issueDate?: string;
  expiryDate?: string;
  documentUrl?: string;
}

export class DiversService {
  async getProfile(userId: string): Promise<DiverProfile> {
    const result = await db.query<{
      id: string;
      user_id: string;
      first_name_en: string;
      first_name_ar: string;
      last_name_en: string;
      last_name_ar: string;
      date_of_birth: Date;
      nationality: string;
      experience_level: string;
      total_logged_dives: number;
      deepest_dive_meters: number;
      is_minor: boolean;
      medical_clearance_status: string;
      emergency_contact_name: string;
      emergency_contact_phone: string;
      emergency_contact_relationship: string;
      profile_photo_url: string;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT * FROM diver_profiles WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Diver profile');
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      firstNameEn: row.first_name_en,
      firstNameAr: row.first_name_ar,
      lastNameEn: row.last_name_en,
      lastNameAr: row.last_name_ar,
      dateOfBirth: row.date_of_birth,
      nationality: row.nationality,
      experienceLevel: row.experience_level,
      totalLoggedDives: row.total_logged_dives,
      isMinor: row.is_minor,
      emergencyContactName: row.emergency_contact_name,
      emergencyContactPhone: row.emergency_contact_phone,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async updateProfile(userId: string, dto: UpdateDiverProfileDto): Promise<DiverProfile> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, string> = {
      firstNameEn: 'first_name_en',
      firstNameAr: 'first_name_ar',
      lastNameEn: 'last_name_en',
      lastNameAr: 'last_name_ar',
      dateOfBirth: 'date_of_birth',
      nationality: 'nationality',
      experienceLevel: 'experience_level',
      emergencyContactName: 'emergency_contact_name',
      emergencyContactPhone: 'emergency_contact_phone',
      emergencyContactRelationship: 'emergency_contact_relationship',
    };

    for (const [key, dbField] of Object.entries(fieldMap)) {
      const value = dto[key as keyof UpdateDiverProfileDto];
      if (value !== undefined) {
        updates.push(`${dbField} = $${paramIndex++}`);
        values.push(value);
      }
    }

    if (updates.length > 0) {
      values.push(userId);
      await db.query(
        `UPDATE diver_profiles SET ${updates.join(', ')}, updated_at = NOW() WHERE user_id = $${paramIndex}`,
        values
      );
    }

    return this.getProfile(userId);
  }

  async getCertifications(userId: string): Promise<Certification[]> {
    const result = await db.query<{
      id: string;
      user_id: string;
      agency: string;
      certification_type: string;
      certification_number: string;
      certification_level: string;
      issue_date: Date;
      expiry_date: Date;
      verification_status: string;
      document_url: string;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT * FROM certifications WHERE user_id = $1 ORDER BY issue_date DESC`,
      [userId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      agency: row.agency,
      certificationType: row.certification_type,
      certificationNumber: row.certification_number,
      certificationLevel: row.certification_level,
      issueDate: row.issue_date,
      expiryDate: row.expiry_date,
      verificationStatus: row.verification_status as Certification['verificationStatus'],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async addCertification(userId: string, dto: AddCertificationDto): Promise<Certification> {
    const result = await db.query<{ id: string; created_at: Date; updated_at: Date }>(
      `INSERT INTO certifications (user_id, agency, certification_type, certification_number,
       certification_level, issue_date, expiry_date, document_url, verification_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
       RETURNING id, created_at, updated_at`,
      [
        userId,
        dto.agency,
        dto.certificationType,
        dto.certificationNumber,
        dto.certificationLevel,
        dto.issueDate,
        dto.expiryDate,
        dto.documentUrl,
      ]
    );

    return {
      id: result.rows[0].id,
      userId,
      agency: dto.agency,
      certificationType: dto.certificationType,
      certificationNumber: dto.certificationNumber,
      certificationLevel: dto.certificationLevel,
      issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
      verificationStatus: 'pending',
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
    };
  }

  async deleteCertification(userId: string, certificationId: string): Promise<void> {
    const result = await db.query(
      'DELETE FROM certifications WHERE id = $1 AND user_id = $2',
      [certificationId, userId]
    );

    if (result.rowCount === 0) {
      throw new NotFoundError('Certification');
    }
  }

  async getMedicalStatus(userId: string): Promise<{ status: string; expiresAt?: Date }> {
    const result = await db.query<{ medical_clearance_status: string; medical_clearance_expires: Date }>(
      'SELECT medical_clearance_status, medical_clearance_expires FROM diver_profiles WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Diver profile');
    }

    return {
      status: result.rows[0].medical_clearance_status,
      expiresAt: result.rows[0].medical_clearance_expires,
    };
  }
}

export const diversService = new DiversService();
