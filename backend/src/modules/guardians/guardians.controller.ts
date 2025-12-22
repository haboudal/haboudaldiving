import { Request, Response } from 'express';
import { guardiansService } from './guardians.service';
import { asyncHandler } from '../../utils/helpers';

export class GuardiansController {
  getMinors = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const minors = await guardiansService.getLinkedMinors(req.user!.userId);

    res.json({
      success: true,
      data: minors,
    });
  });

  linkMinor = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { minorEmail, relationship } = req.body;
    const result = await guardiansService.initiateLink(req.user!.userId, minorEmail, relationship);

    res.status(201).json({
      success: true,
      message: 'Link request created. The minor will need to confirm.',
      data: result,
    });
  });

  giveConsent = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { minorId } = req.params;
    await guardiansService.giveConsent(req.user!.userId, minorId, req.ip);

    res.json({
      success: true,
      message: 'Consent given successfully',
    });
  });

  revokeConsent = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { minorId } = req.params;
    await guardiansService.revokeConsent(req.user!.userId, minorId);

    res.json({
      success: true,
      message: 'Consent revoked',
    });
  });

  getPendingApprovals = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const approvals = await guardiansService.getPendingApprovals(req.user!.userId);

    res.json({
      success: true,
      data: approvals,
    });
  });

  approveBooking = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { bookingId } = req.params;
    await guardiansService.approveBooking(req.user!.userId, bookingId);

    res.json({
      success: true,
      message: 'Booking approved',
    });
  });
}

export const guardiansController = new GuardiansController();
