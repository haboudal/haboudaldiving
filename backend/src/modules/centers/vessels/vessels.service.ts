import { db } from '../../../config/database';
import { NotFoundError } from '../../../utils/errors';
import { Vessel } from '../../../types';
import { centersService } from '../centers.service';

interface CreateVesselDto {
  name: string;
  nameAr?: string;
  registrationNumber?: string;
  vesselType: string;
  capacity: number;
  diverCapacity: number;
  safetyEquipment?: string[];
}

interface UpdateVesselDto extends Partial<CreateVesselDto> {}

export class VesselsService {
  async findByCenter(centerId: string): Promise<Vessel[]> {
    const result = await db.query(
      "SELECT * FROM vessels WHERE center_id = $1 AND status != 'deactivated' ORDER BY name",
      [centerId]
    );

    return result.rows.map(this.mapToVessel);
  }

  async findById(centerId: string, vesselId: string): Promise<Vessel> {
    const result = await db.query(
      'SELECT * FROM vessels WHERE id = $1 AND center_id = $2',
      [vesselId, centerId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Vessel');
    }

    return this.mapToVessel(result.rows[0]);
  }

  async create(centerId: string, userId: string, dto: CreateVesselDto): Promise<Vessel> {
    await centersService.verifyOwnership(centerId, userId);

    const result = await db.query<{ id: string }>(
      `INSERT INTO vessels (center_id, name, name_ar, registration_number, vessel_type,
       capacity, diver_capacity, safety_equipment, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
       RETURNING id`,
      [
        centerId,
        dto.name,
        dto.nameAr,
        dto.registrationNumber,
        dto.vesselType,
        dto.capacity,
        dto.diverCapacity,
        JSON.stringify(dto.safetyEquipment || []),
      ]
    );

    return this.findById(centerId, result.rows[0].id);
  }

  async update(centerId: string, vesselId: string, userId: string, dto: UpdateVesselDto): Promise<Vessel> {
    await centersService.verifyOwnership(centerId, userId);

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (dto.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(dto.name);
    }
    if (dto.nameAr !== undefined) {
      updates.push(`name_ar = $${paramIndex++}`);
      values.push(dto.nameAr);
    }
    if (dto.registrationNumber !== undefined) {
      updates.push(`registration_number = $${paramIndex++}`);
      values.push(dto.registrationNumber);
    }
    if (dto.vesselType !== undefined) {
      updates.push(`vessel_type = $${paramIndex++}`);
      values.push(dto.vesselType);
    }
    if (dto.capacity !== undefined) {
      updates.push(`capacity = $${paramIndex++}`);
      values.push(dto.capacity);
    }
    if (dto.diverCapacity !== undefined) {
      updates.push(`diver_capacity = $${paramIndex++}`);
      values.push(dto.diverCapacity);
    }
    if (dto.safetyEquipment !== undefined) {
      updates.push(`safety_equipment = $${paramIndex++}`);
      values.push(JSON.stringify(dto.safetyEquipment));
    }

    if (updates.length > 0) {
      values.push(vesselId, centerId);
      await db.query(
        `UPDATE vessels SET ${updates.join(', ')}, updated_at = NOW()
         WHERE id = $${paramIndex++} AND center_id = $${paramIndex}`,
        values
      );
    }

    return this.findById(centerId, vesselId);
  }

  async delete(centerId: string, vesselId: string, userId: string): Promise<void> {
    await centersService.verifyOwnership(centerId, userId);

    const result = await db.query(
      "UPDATE vessels SET status = 'deactivated', updated_at = NOW() WHERE id = $1 AND center_id = $2",
      [vesselId, centerId]
    );

    if (result.rowCount === 0) {
      throw new NotFoundError('Vessel');
    }
  }

  private mapToVessel(row: Record<string, unknown>): Vessel {
    return {
      id: row.id as string,
      centerId: row.center_id as string,
      name: row.name as string,
      registrationNumber: row.registration_number as string,
      vesselType: row.vessel_type as string,
      capacity: row.capacity as number,
      diverCapacity: row.diver_capacity as number,
      status: row.status as Vessel['status'],
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }
}

export const vesselsService = new VesselsService();
