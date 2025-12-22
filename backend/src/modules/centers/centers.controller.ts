import { Request, Response } from 'express';
import { centersService } from './centers.service';
import { asyncHandler, paginate } from '../../utils/helpers';

export class CentersController {
  list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const city = req.query.city as string;

    const { centers, total } = await centersService.findAll({ page, limit, city });

    res.json({
      success: true,
      ...paginate(centers, total, { page, limit }),
    });
  });

  getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const center = await centersService.findById(req.params.id);

    res.json({
      success: true,
      data: center,
    });
  });

  create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const center = await centersService.create(req.user!.userId, req.body);

    res.status(201).json({
      success: true,
      message: 'Center created. Pending verification.',
      data: center,
    });
  });

  update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const center = await centersService.update(req.params.id, req.user!.userId, req.body);

    res.json({
      success: true,
      data: center,
    });
  });

  delete = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await centersService.deactivate(req.params.id, req.user!.userId);

    res.json({
      success: true,
      message: 'Center deactivated',
    });
  });
}

export const centersController = new CentersController();
