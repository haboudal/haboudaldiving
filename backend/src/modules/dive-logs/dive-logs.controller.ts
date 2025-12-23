import { Request, Response, NextFunction } from 'express';
import { diveLogsService } from './dive-logs.service';
import {
  createDiveLogSchema,
  updateDiveLogSchema,
  verifyDiveLogSchema,
  diveLogFiltersSchema,
  importComputerDataSchema,
} from './dive-logs.validation';

export class DiveLogsController {
  // ============================================================================
  // GET MY DIVE LOGS
  // ============================================================================

  async getMyDiveLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const filters = diveLogFiltersSchema.parse(req.query);

      const { diveLogs, total } = await diveLogsService.getUserDiveLogs(userId, filters);

      const page = filters.page || 1;
      const limit = filters.limit || 20;

      res.json({
        success: true,
        data: {
          diveLogs,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // GET MY DIVE STATISTICS
  // ============================================================================

  async getMyStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;

      const statistics = await diveLogsService.getUserDiveStatistics(userId);

      res.json({
        success: true,
        data: { statistics },
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // GET SINGLE DIVE LOG
  // ============================================================================

  async getDiveLog(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const diveLogId = req.params.id;

      const diveLog = await diveLogsService.getDiveLogById(diveLogId, userId);

      res.json({
        success: true,
        data: { diveLog },
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // CREATE DIVE LOG
  // ============================================================================

  async createDiveLog(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const dto = createDiveLogSchema.parse(req.body);

      const diveLog = await diveLogsService.createDiveLog(userId, dto);

      res.status(201).json({
        success: true,
        message: 'Dive log created successfully',
        data: { diveLog },
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // UPDATE DIVE LOG
  // ============================================================================

  async updateDiveLog(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const diveLogId = req.params.id;
      const dto = updateDiveLogSchema.parse(req.body);

      const diveLog = await diveLogsService.updateDiveLog(userId, diveLogId, dto);

      res.json({
        success: true,
        message: 'Dive log updated successfully',
        data: { diveLog },
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // DELETE DIVE LOG
  // ============================================================================

  async deleteDiveLog(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const diveLogId = req.params.id;

      await diveLogsService.deleteDiveLog(userId, diveLogId);

      res.json({
        success: true,
        message: 'Dive log deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // VERIFY DIVE LOG (Instructor only)
  // ============================================================================

  async verifyDiveLog(req: Request, res: Response, next: NextFunction) {
    try {
      const instructorId = req.user!.userId;
      const diveLogId = req.params.id;
      const { signatureUrl } = verifyDiveLogSchema.parse(req.body);

      const diveLog = await diveLogsService.verifyDiveLog(instructorId, diveLogId, signatureUrl);

      res.json({
        success: true,
        message: 'Dive log verified successfully',
        data: { diveLog },
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // IMPORT FROM DIVE COMPUTER
  // ============================================================================

  async importFromComputer(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const dto = importComputerDataSchema.parse(req.body);

      const result = await diveLogsService.importFromComputer(userId, dto);

      res.status(201).json({
        success: true,
        message: `Successfully imported ${result.imported} dives`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // GET DIVES FOR TRIP (for linking purposes)
  // ============================================================================

  async getDivesForTrip(req: Request, res: Response, next: NextFunction) {
    try {
      const tripId = req.params.tripId;

      const diveLogs = await diveLogsService.getDivesForTrip(tripId);

      res.json({
        success: true,
        data: { diveLogs },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const diveLogsController = new DiveLogsController();
