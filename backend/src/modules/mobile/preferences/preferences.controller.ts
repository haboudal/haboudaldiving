import { Request, Response } from 'express';
import { preferencesService } from './preferences.service';
import { asyncHandler } from '../../../utils/helpers';
import { UpdatePreferencesDto } from '../mobile.types';

export class PreferencesController {
  /**
   * GET /mobile/preferences
   * Get user's notification preferences
   */
  get = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const preferences = await preferencesService.findByUser(req.user!.userId);

    res.json({
      success: true,
      data: preferences,
    });
  });

  /**
   * PATCH /mobile/preferences
   * Update user's notification preferences
   */
  update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as UpdatePreferencesDto;
    const preferences = await preferencesService.update(req.user!.userId, dto);

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      data: preferences,
    });
  });

  /**
   * POST /mobile/preferences/reset
   * Reset preferences to defaults
   */
  reset = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const preferences = await preferencesService.reset(req.user!.userId);

    res.json({
      success: true,
      message: 'Preferences reset to defaults',
      data: preferences,
    });
  });
}

export const preferencesController = new PreferencesController();
