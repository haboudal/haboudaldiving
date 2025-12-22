import { Request, Response } from 'express';
import { diversService } from './divers.service';
import { asyncHandler } from '../../utils/helpers';
import { ForbiddenError } from '../../utils/errors';

export class DiversController {
  private checkAccess(req: Request, targetUserId: string): void {
    if (req.user!.role !== 'admin' && req.user!.userId !== targetUserId) {
      throw new ForbiddenError('Access denied');
    }
  }

  getProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.params.id;
    this.checkAccess(req, userId);

    const profile = await diversService.getProfile(userId);

    res.json({
      success: true,
      data: profile,
    });
  });

  updateProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.params.id;
    this.checkAccess(req, userId);

    const profile = await diversService.updateProfile(userId, req.body);

    res.json({
      success: true,
      data: profile,
    });
  });

  getCertifications = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.params.id;
    this.checkAccess(req, userId);

    const certifications = await diversService.getCertifications(userId);

    res.json({
      success: true,
      data: certifications,
    });
  });

  addCertification = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.params.id;
    this.checkAccess(req, userId);

    const certification = await diversService.addCertification(userId, req.body);

    res.status(201).json({
      success: true,
      data: certification,
    });
  });

  deleteCertification = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.params.id;
    this.checkAccess(req, userId);

    await diversService.deleteCertification(userId, req.params.certId);

    res.json({
      success: true,
      message: 'Certification deleted',
    });
  });

  getMedicalStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.params.id;
    this.checkAccess(req, userId);

    const status = await diversService.getMedicalStatus(userId);

    res.json({
      success: true,
      data: status,
    });
  });
}

export const diversController = new DiversController();
