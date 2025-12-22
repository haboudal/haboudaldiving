import { db } from '../../../config/database';
import { NotFoundError, ForbiddenError } from '../../../utils/errors';
import {
  MobileDevice,
  RegisterDeviceDto,
  UpdateDeviceDto,
} from '../mobile.types';

export class DevicesService {
  /**
   * Register a new device or update existing one
   */
  async register(userId: string, dto: RegisterDeviceDto): Promise<MobileDevice> {
    // Upsert device based on user_id + device_identifier
    const result = await db.query(
      `INSERT INTO mobile_devices (
        user_id, device_identifier, device_type, device_name,
        os_version, app_version, model, push_token, push_token_type,
        is_active, last_used_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, NOW())
      ON CONFLICT (user_id, device_identifier)
      DO UPDATE SET
        device_type = EXCLUDED.device_type,
        device_name = COALESCE(EXCLUDED.device_name, mobile_devices.device_name),
        os_version = COALESCE(EXCLUDED.os_version, mobile_devices.os_version),
        app_version = COALESCE(EXCLUDED.app_version, mobile_devices.app_version),
        model = COALESCE(EXCLUDED.model, mobile_devices.model),
        push_token = COALESCE(EXCLUDED.push_token, mobile_devices.push_token),
        push_token_type = COALESCE(EXCLUDED.push_token_type, mobile_devices.push_token_type),
        is_active = TRUE,
        last_used_at = NOW(),
        updated_at = NOW()
      RETURNING *`,
      [
        userId,
        dto.deviceIdentifier,
        dto.deviceType,
        dto.deviceName,
        dto.osVersion,
        dto.appVersion,
        dto.model,
        dto.pushToken,
        dto.pushTokenType,
      ]
    );

    return this.mapToDevice(result.rows[0]);
  }

  /**
   * Find all devices for a user
   */
  async findByUser(userId: string): Promise<MobileDevice[]> {
    const result = await db.query(
      `SELECT * FROM mobile_devices
       WHERE user_id = $1 AND is_active = TRUE
       ORDER BY last_used_at DESC`,
      [userId]
    );

    return result.rows.map(this.mapToDevice);
  }

  /**
   * Find device by ID
   */
  async findById(deviceId: string): Promise<MobileDevice> {
    const result = await db.query(
      'SELECT * FROM mobile_devices WHERE id = $1',
      [deviceId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Device');
    }

    return this.mapToDevice(result.rows[0]);
  }

  /**
   * Update device info
   */
  async update(deviceId: string, userId: string, dto: UpdateDeviceDto): Promise<MobileDevice> {
    // Verify ownership
    await this.verifyOwnership(deviceId, userId);

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, string> = {
      deviceName: 'device_name',
      osVersion: 'os_version',
      appVersion: 'app_version',
      pushToken: 'push_token',
      pushTokenType: 'push_token_type',
      pushEnabled: 'push_enabled',
    };

    for (const [key, dbField] of Object.entries(fieldMap)) {
      const value = dto[key as keyof UpdateDeviceDto];
      if (value !== undefined) {
        updates.push(`${dbField} = $${paramIndex++}`);
        values.push(value);
      }
    }

    if (updates.length > 0) {
      values.push(deviceId);
      await db.query(
        `UPDATE mobile_devices SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`,
        values
      );
    }

    return this.findById(deviceId);
  }

  /**
   * Deactivate a device (soft delete)
   */
  async deactivate(deviceId: string, userId: string): Promise<void> {
    await this.verifyOwnership(deviceId, userId);

    await db.query(
      `UPDATE mobile_devices
       SET is_active = FALSE, push_token = NULL, updated_at = NOW()
       WHERE id = $1`,
      [deviceId]
    );
  }

  /**
   * Record device activity (update last_used_at)
   */
  async recordActivity(deviceId: string): Promise<void> {
    await db.query(
      'UPDATE mobile_devices SET last_used_at = NOW() WHERE id = $1',
      [deviceId]
    );
  }

  /**
   * Get all active devices with push tokens for a user
   */
  async getActiveDevicesWithPush(userId: string): Promise<MobileDevice[]> {
    const result = await db.query(
      `SELECT * FROM mobile_devices
       WHERE user_id = $1
         AND is_active = TRUE
         AND push_enabled = TRUE
         AND push_token IS NOT NULL
       ORDER BY last_used_at DESC`,
      [userId]
    );

    return result.rows.map(this.mapToDevice);
  }

  /**
   * Verify device ownership
   */
  private async verifyOwnership(deviceId: string, userId: string): Promise<void> {
    const result = await db.query(
      'SELECT id FROM mobile_devices WHERE id = $1 AND user_id = $2',
      [deviceId, userId]
    );

    if (result.rows.length === 0) {
      throw new ForbiddenError('Not authorized to manage this device');
    }
  }

  /**
   * Map database row to MobileDevice
   */
  private mapToDevice(row: Record<string, unknown>): MobileDevice {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      deviceIdentifier: row.device_identifier as string,
      deviceType: row.device_type as MobileDevice['deviceType'],
      deviceName: row.device_name as string | null,
      osVersion: row.os_version as string | null,
      appVersion: row.app_version as string | null,
      model: row.model as string | null,
      pushToken: row.push_token as string | null,
      pushTokenType: row.push_token_type as MobileDevice['pushTokenType'],
      pushEnabled: row.push_enabled as boolean,
      isActive: row.is_active as boolean,
      lastUsedAt: (row.last_used_at as Date).toISOString(),
      createdAt: (row.created_at as Date).toISOString(),
      updatedAt: (row.updated_at as Date).toISOString(),
    };
  }
}

export const devicesService = new DevicesService();
