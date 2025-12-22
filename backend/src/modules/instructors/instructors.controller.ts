import { Request, Response } from 'express';
import { instructorsService } from './instructors.service';
import { asyncHandler, paginate } from '../../utils/helpers';
import { ForbiddenError } from '../../utils/errors';

export class InstructorsController {
  list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const city = req.query.city as string;

    const { instructors, total } = await instructorsService.findAll({ page, limit, city });

    res.json({
      success: true,
      ...paginate(instructors, total, { page, limit }),
    });
  });

  getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const instructor = await instructorsService.findById(req.params.id);

    res.json({
      success: true,
      data: instructor,
    });
  });

  update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.params.id;

    if (req.user!.role !== 'admin' && req.user!.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    const instructor = await instructorsService.update(userId, req.body);

    res.json({
      success: true,
      data: instructor,
    });
  });

  getSchedule = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const schedule = await instructorsService.getSchedule(req.params.id);

    res.json({
      success: true,
      data: schedule,
    });
  });

  updateSchedule = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.params.id;

    if (req.user!.role !== 'admin' && req.user!.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    const schedule = await instructorsService.updateSchedule(userId, req.body);

    res.json({
      success: true,
      data: schedule,
    });
  });
}

export const instructorsController = new InstructorsController();
