import { Request, Response } from 'express';
import { syncService } from './sync.service';
import { asyncHandler } from '../../../utils/helpers';
import { SubmitSyncDto, ConfirmSyncDto, SyncEntityType } from '../mobile.types';

export class SyncController {
  /**
   * POST /mobile/sync/queue
   * Submit offline changes
   */
  submitChanges = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as SubmitSyncDto;
    const results = await syncService.submitChanges(
      req.user!.userId,
      dto.deviceId,
      dto.items
    );

    res.json({
      success: true,
      data: results,
    });
  });

  /**
   * GET /mobile/sync/status
   * Get sync status
   */
  getStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const status = await syncService.getStatus(
      req.user!.userId,
      req.query.deviceId as string | undefined,
      req.query.status as 'pending' | 'failed' | undefined
    );

    res.json({
      success: true,
      data: status,
    });
  });

  /**
   * POST /mobile/sync/confirm
   * Confirm synced items
   */
  confirmSync = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as ConfirmSyncDto;
    const result = await syncService.confirmSync(req.user!.userId, dto.clientIds);

    res.json({
      success: true,
      message: `${result.confirmed} items confirmed`,
      data: result,
    });
  });

  /**
   * GET /mobile/sync/delta/:entityType
   * Get delta changes since last sync
   */
  getDeltaSync = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const entityType = req.params.entityType as SyncEntityType;
    const since = req.query.since as string | undefined;
    const limit = parseInt(req.query.limit as string) || 100;
    const deviceId = req.query.deviceId as string | undefined;

    const result = await syncService.getDeltaSync(
      req.user!.userId,
      deviceId,
      entityType,
      since,
      limit
    );

    // Set sync token header
    res.set('X-Sync-Token', result.checkpoint);

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * GET /mobile/sync/init/:entityType
   * Get initial sync data
   */
  getInitialSync = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const entityType = req.params.entityType as SyncEntityType;
    const deviceId = req.query.deviceId as string | undefined;

    const result = await syncService.getInitialSync(
      req.user!.userId,
      deviceId,
      entityType
    );

    // Set sync token header
    res.set('X-Sync-Token', result.checkpoint);

    res.json({
      success: true,
      data: result,
    });
  });
}

export const syncController = new SyncController();
