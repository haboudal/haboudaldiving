import { db } from '../../../config/database';
import { ValidationError } from '../../../utils/errors';
import { generateToken } from '../../../utils/helpers';
import {
  SyncQueueItem,
  SyncItemInput,
  SyncResult,
  SyncStatusResponse,
  SyncCheckpoint,
  DeltaSyncResponse,
  InitialSyncResponse,
  SyncEntityType,
} from '../mobile.types';

// Entity type to table mapping
const ENTITY_TABLE_MAP: Record<SyncEntityType, { table: string; userColumn: string }> = {
  dive_logs: { table: 'dive_logs', userColumn: 'user_id' },
  certifications: { table: 'certifications', userColumn: 'user_id' },
  bookings: { table: 'trip_bookings', userColumn: 'diver_user_id' },
  favorites: { table: 'user_favorites', userColumn: 'user_id' },
};

export class SyncService {
  /**
   * Submit offline changes to the sync queue
   */
  async submitChanges(
    userId: string,
    deviceId: string | undefined,
    items: SyncItemInput[]
  ): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    for (const item of items) {
      try {
        // Insert into sync queue
        await db.query(
          `INSERT INTO sync_queue (
            user_id, device_id, client_id, action, entity_type, entity_id, payload, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
          ON CONFLICT (user_id, client_id) DO UPDATE SET
            action = EXCLUDED.action,
            payload = EXCLUDED.payload,
            status = 'pending',
            retry_count = sync_queue.retry_count + 1`,
          [
            userId,
            deviceId,
            item.clientId,
            item.action,
            item.entityType,
            item.entityId,
            JSON.stringify(item.payload),
          ]
        );

        // Process the item immediately
        const processResult = await this.processQueueItem(userId, item);
        results.push(processResult);
      } catch (error) {
        results.push({
          clientId: item.clientId,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Process a single sync queue item
   */
  async processQueueItem(userId: string, item: SyncItemInput): Promise<SyncResult> {
    const entityConfig = ENTITY_TABLE_MAP[item.entityType as SyncEntityType];
    if (!entityConfig) {
      return {
        clientId: item.clientId,
        status: 'failed',
        error: `Unknown entity type: ${item.entityType}`,
      };
    }

    try {
      let serverEntityId: string | undefined;

      switch (item.action) {
        case 'create':
          serverEntityId = await this.handleCreate(userId, entityConfig, item.payload);
          break;
        case 'update':
          if (!item.entityId) {
            throw new ValidationError('entityId required for update');
          }
          await this.handleUpdate(userId, entityConfig, item.entityId, item.payload);
          serverEntityId = item.entityId;
          break;
        case 'delete':
          if (!item.entityId) {
            throw new ValidationError('entityId required for delete');
          }
          await this.handleDelete(userId, entityConfig, item.entityId);
          break;
      }

      // Update sync queue item status
      await db.query(
        `UPDATE sync_queue SET status = 'synced', server_entity_id = $1, synced_at = NOW()
         WHERE user_id = $2 AND client_id = $3`,
        [serverEntityId, userId, item.clientId]
      );

      return {
        clientId: item.clientId,
        status: 'synced',
        serverEntityId,
      };
    } catch (error) {
      // Update sync queue with error
      await db.query(
        `UPDATE sync_queue SET status = 'failed', error_message = $1
         WHERE user_id = $2 AND client_id = $3`,
        [error instanceof Error ? error.message : 'Unknown error', userId, item.clientId]
      );

      return {
        clientId: item.clientId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle create action
   */
  private async handleCreate(
    userId: string,
    entityConfig: { table: string; userColumn: string },
    payload: Record<string, unknown>
  ): Promise<string> {
    // Build insert query from payload
    const columns = [entityConfig.userColumn];
    const values: unknown[] = [userId];
    const placeholders = ['$1'];
    let paramIndex = 2;

    for (const [key, value] of Object.entries(payload)) {
      if (key !== 'id' && key !== entityConfig.userColumn) {
        columns.push(this.camelToSnake(key));
        values.push(value);
        placeholders.push(`$${paramIndex++}`);
      }
    }

    const result = await db.query(
      `INSERT INTO ${entityConfig.table} (${columns.join(', ')})
       VALUES (${placeholders.join(', ')})
       RETURNING id`,
      values
    );

    return result.rows[0].id;
  }

  /**
   * Handle update action
   */
  private async handleUpdate(
    userId: string,
    entityConfig: { table: string; userColumn: string },
    entityId: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(payload)) {
      if (key !== 'id' && key !== entityConfig.userColumn) {
        updates.push(`${this.camelToSnake(key)} = $${paramIndex++}`);
        values.push(value);
      }
    }

    if (updates.length === 0) return;

    values.push(entityId, userId);
    await db.query(
      `UPDATE ${entityConfig.table}
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex++} AND ${entityConfig.userColumn} = $${paramIndex}`,
      values
    );
  }

  /**
   * Handle delete action
   */
  private async handleDelete(
    userId: string,
    entityConfig: { table: string; userColumn: string },
    entityId: string
  ): Promise<void> {
    await db.query(
      `DELETE FROM ${entityConfig.table}
       WHERE id = $1 AND ${entityConfig.userColumn} = $2`,
      [entityId, userId]
    );
  }

  /**
   * Get sync status (pending/failed items)
   */
  async getStatus(
    userId: string,
    deviceId?: string,
    status?: 'pending' | 'failed'
  ): Promise<SyncStatusResponse> {
    const params: unknown[] = [userId];
    let paramIndex = 2;
    const conditions = ['user_id = $1'];

    if (deviceId) {
      conditions.push(`device_id = $${paramIndex++}`);
      params.push(deviceId);
    }

    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(status);
    } else {
      conditions.push("status IN ('pending', 'failed')");
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await db.query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'failed') as failed
       FROM sync_queue WHERE user_id = $1`,
      [userId]
    );

    const itemsResult = await db.query(
      `SELECT * FROM sync_queue WHERE ${whereClause} ORDER BY created_at DESC LIMIT 100`,
      params
    );

    return {
      pending: parseInt(countResult.rows[0].pending, 10),
      failed: parseInt(countResult.rows[0].failed, 10),
      items: itemsResult.rows.map(this.mapToSyncQueueItem),
    };
  }

  /**
   * Confirm sync completion for items
   */
  async confirmSync(userId: string, clientIds: string[]): Promise<{ confirmed: number }> {
    const result = await db.query(
      `DELETE FROM sync_queue
       WHERE user_id = $1 AND client_id = ANY($2) AND status = 'synced'`,
      [userId, clientIds]
    );

    return {
      confirmed: result.rowCount || 0,
    };
  }

  /**
   * Get delta sync (changes since last sync)
   */
  async getDeltaSync<T>(
    userId: string,
    deviceId: string | undefined,
    entityType: SyncEntityType,
    since?: string,
    limit = 100
  ): Promise<DeltaSyncResponse<T>> {
    const entityConfig = ENTITY_TABLE_MAP[entityType];
    if (!entityConfig) {
      throw new ValidationError(`Unknown entity type: ${entityType}`);
    }

    const sinceDate = since ? new Date(since) : new Date(0);

    // Get updated items
    const itemsResult = await db.query(
      `SELECT * FROM ${entityConfig.table}
       WHERE ${entityConfig.userColumn} = $1 AND updated_at > $2
       ORDER BY updated_at ASC
       LIMIT $3`,
      [userId, sinceDate, limit + 1]
    );

    const hasMore = itemsResult.rows.length > limit;
    const items = itemsResult.rows.slice(0, limit);

    // Get deleted items (from audit log or soft delete)
    // For now, return empty array - would need audit log integration
    const deleted: string[] = [];

    // Generate checkpoint
    const checkpoint = new Date().toISOString();

    // Update checkpoint
    if (deviceId) {
      await this.updateCheckpoint(userId, deviceId, entityType, checkpoint);
    }

    return {
      items: items as T[],
      deleted,
      checkpoint,
      hasMore,
    };
  }

  /**
   * Get initial sync (full data)
   */
  async getInitialSync<T>(
    userId: string,
    deviceId: string | undefined,
    entityType: SyncEntityType
  ): Promise<InitialSyncResponse<T>> {
    const entityConfig = ENTITY_TABLE_MAP[entityType];
    if (!entityConfig) {
      throw new ValidationError(`Unknown entity type: ${entityType}`);
    }

    const result = await db.query(
      `SELECT * FROM ${entityConfig.table}
       WHERE ${entityConfig.userColumn} = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    const checkpoint = new Date().toISOString();

    // Update checkpoint
    if (deviceId) {
      await this.updateCheckpoint(userId, deviceId, entityType, checkpoint);
    }

    return {
      items: result.rows as T[],
      checkpoint,
      totalCount: result.rows.length,
    };
  }

  /**
   * Get sync checkpoint
   */
  async getCheckpoint(
    userId: string,
    deviceId: string,
    entityType: string
  ): Promise<SyncCheckpoint | null> {
    const result = await db.query(
      `SELECT * FROM sync_checkpoints
       WHERE user_id = $1 AND device_id = $2 AND entity_type = $3`,
      [userId, deviceId, entityType]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      entityType: row.entity_type,
      lastSyncAt: (row.last_sync_at as Date).toISOString(),
      syncToken: row.sync_token,
    };
  }

  /**
   * Update sync checkpoint
   */
  async updateCheckpoint(
    userId: string,
    deviceId: string,
    entityType: string,
    timestamp: string
  ): Promise<void> {
    const syncToken = generateToken();

    await db.query(
      `INSERT INTO sync_checkpoints (user_id, device_id, entity_type, last_sync_at, sync_token)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, device_id, entity_type)
       DO UPDATE SET last_sync_at = EXCLUDED.last_sync_at, sync_token = EXCLUDED.sync_token, updated_at = NOW()`,
      [userId, deviceId, entityType, timestamp, syncToken]
    );
  }

  /**
   * Convert camelCase to snake_case
   */
  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }

  /**
   * Map database row to SyncQueueItem
   */
  private mapToSyncQueueItem(row: Record<string, unknown>): SyncQueueItem {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      deviceId: row.device_id as string | null,
      clientId: row.client_id as string,
      action: row.action as SyncQueueItem['action'],
      entityType: row.entity_type as string,
      entityId: row.entity_id as string | null,
      payload: row.payload as Record<string, unknown>,
      status: row.status as SyncQueueItem['status'],
      serverEntityId: row.server_entity_id as string | null,
      errorMessage: row.error_message as string | null,
      retryCount: row.retry_count as number,
      createdAt: (row.created_at as Date).toISOString(),
      syncedAt: row.synced_at ? (row.synced_at as Date).toISOString() : null,
    };
  }
}

export const syncService = new SyncService();
