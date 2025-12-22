import { Request, Response } from 'express';
import { usersService } from './users.service';
import { asyncHandler } from '../../utils/helpers';

export class UsersController {
  getMe = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = await usersService.findById(req.user!.userId);

    res.json({
      success: true,
      data: user,
    });
  });

  updateMe = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = await usersService.update(req.user!.userId, req.body);

    res.json({
      success: true,
      data: user,
    });
  });

  deactivateMe = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await usersService.deactivate(req.user!.userId);

    res.json({
      success: true,
      message: 'Account deactivated successfully',
    });
  });

  getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = await usersService.findById(req.params.id);

    res.json({
      success: true,
      data: user,
    });
  });
}

export const usersController = new UsersController();
