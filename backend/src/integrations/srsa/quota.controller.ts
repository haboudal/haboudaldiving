import { Request, Response } from 'express';
import { srsaQuotaService } from './quota.service';
import { asyncHandler } from '../../utils/helpers';
import { ValidationError, NotFoundError } from '../../utils/errors';

export class QuotaController {
  checkQuota = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { siteCode, date, numberOfDivers } = req.body;

    if (!siteCode || !date || !numberOfDivers) {
      throw new ValidationError('siteCode, date, and numberOfDivers are required');
    }

    const result = await srsaQuotaService.checkQuota({
      siteCode,
      date,
      numberOfDivers: parseInt(numberOfDivers, 10),
    });

    res.json({
      success: true,
      data: result,
    });
  });

  reserveQuota = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { siteCode, date, numberOfDivers, centerId, centerPermitNumber, vesselRegistration, tripId } = req.body;

    const permit = await srsaQuotaService.requestPermit({
      siteCode,
      date,
      numberOfDivers,
      centerId,
      centerPermitNumber,
      vesselRegistration,
      tripId,
    });

    res.status(201).json({
      success: true,
      data: permit,
    });
  });

  cancelReservation = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { permitNumber } = req.params;
    const { reason } = req.body;

    await srsaQuotaService.cancelPermit(permitNumber, reason || 'User cancelled');

    res.json({
      success: true,
      message: 'Reservation cancelled',
    });
  });

  getForecast = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { siteCode } = req.params;
    const days = parseInt(req.query.days as string) || 7;

    const forecast = await srsaQuotaService.getQuotaForecast(siteCode, days);

    res.json({
      success: true,
      data: forecast,
    });
  });

  getAlternatives = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { siteCode, date, numberOfDivers } = req.query;

    if (!siteCode || !date || !numberOfDivers) {
      throw new ValidationError('siteCode, date, and numberOfDivers are required');
    }

    const alternatives = await srsaQuotaService.getAlternativeSites(
      siteCode as string,
      date as string,
      parseInt(numberOfDivers as string, 10)
    );

    res.json({
      success: true,
      data: alternatives,
    });
  });

  calculateFees = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { siteCode, numberOfDivers } = req.body;

    if (!siteCode || !numberOfDivers) {
      throw new ValidationError('siteCode and numberOfDivers are required');
    }

    // Get site info to determine conservation zone
    const siteInfo = await srsaQuotaService.getSiteInfo(siteCode);

    if (!siteInfo) {
      throw new NotFoundError('Dive site');
    }

    const fees = srsaQuotaService.calculateConservationFee(
      siteCode,
      siteInfo.conservationZone,
      parseInt(numberOfDivers, 10)
    );

    res.json({
      success: true,
      data: {
        ...fees,
        siteName: siteInfo.name,
      },
    });
  });
}

export const quotaController = new QuotaController();
