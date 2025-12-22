import { Request, Response } from 'express';
import { devicesService } from './devices.service';
import { asyncHandler } from '../../../utils/helpers';
import { RegisterDeviceDto, UpdateDeviceDto } from '../mobile.types';

export class DevicesController {
  /**
   * POST /mobile/devices
   * Register a new device
   */
  register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as RegisterDeviceDto;
    const device = await devicesService.register(req.user!.userId, dto);

    res.status(201).json({
      success: true,
      message: 'Device registered successfully',
      data: device,
    });
  });

  /**
   * GET /mobile/devices
   * List user's devices
   */
  list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const devices = await devicesService.findByUser(req.user!.userId);

    res.json({
      success: true,
      data: devices,
    });
  });

  /**
   * GET /mobile/devices/:id
   * Get device details
   */
  getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const device = await devicesService.findById(req.params.id);

    // Verify ownership
    if (device.userId !== req.user!.userId) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied' },
      });
      return;
    }

    res.json({
      success: true,
      data: device,
    });
  });

  /**
   * PATCH /mobile/devices/:id
   * Update device info
   */
  update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as UpdateDeviceDto;
    const device = await devicesService.update(req.params.id, req.user!.userId, dto);

    res.json({
      success: true,
      message: 'Device updated successfully',
      data: device,
    });
  });

  /**
   * DELETE /mobile/devices/:id
   * Deactivate a device
   */
  deactivate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await devicesService.deactivate(req.params.id, req.user!.userId);

    res.json({
      success: true,
      message: 'Device deactivated successfully',
    });
  });
}

export const devicesController = new DevicesController();
