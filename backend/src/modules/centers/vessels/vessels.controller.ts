import { Request, Response } from 'express';
import { vesselsService } from './vessels.service';
import { asyncHandler } from '../../../utils/helpers';

export class VesselsController {
  list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const vessels = await vesselsService.findByCenter(req.params.centerId);

    res.json({
      success: true,
      data: vessels,
    });
  });

  getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const vessel = await vesselsService.findById(req.params.centerId, req.params.vesselId);

    res.json({
      success: true,
      data: vessel,
    });
  });

  create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const vessel = await vesselsService.create(req.params.centerId, req.user!.userId, req.body);

    res.status(201).json({
      success: true,
      data: vessel,
    });
  });

  update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const vessel = await vesselsService.update(
      req.params.centerId,
      req.params.vesselId,
      req.user!.userId,
      req.body
    );

    res.json({
      success: true,
      data: vessel,
    });
  });

  delete = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await vesselsService.delete(req.params.centerId, req.params.vesselId, req.user!.userId);

    res.json({
      success: true,
      message: 'Vessel deleted',
    });
  });
}

export const vesselsController = new VesselsController();
