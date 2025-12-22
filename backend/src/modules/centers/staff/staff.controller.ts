import { Request, Response } from 'express';
import { staffService } from './staff.service';
import { asyncHandler } from '../../../utils/helpers';

export class StaffController {
  list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const staff = await staffService.findByCenter(req.params.centerId);

    res.json({
      success: true,
      data: staff,
    });
  });

  add = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const staff = await staffService.addStaff(req.params.centerId, req.user!.userId, req.body);

    res.status(201).json({
      success: true,
      data: staff,
    });
  });

  update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const staff = await staffService.updateStaff(
      req.params.centerId,
      req.params.staffId,
      req.user!.userId,
      req.body
    );

    res.json({
      success: true,
      data: staff,
    });
  });

  remove = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await staffService.removeStaff(req.params.centerId, req.params.staffId, req.user!.userId);

    res.json({
      success: true,
      message: 'Staff member removed',
    });
  });
}

export const staffController = new StaffController();
