import { Request, Response } from 'express';
import { tripsService } from './trips.service';
import { asyncHandler, paginate } from '../../utils/helpers';
import { TripFilters } from './trips.types';

export class TripsController {
  list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const filters: TripFilters = {
      centerId: req.query.centerId as string,
      siteId: req.query.siteId as string,
      status: req.query.status as TripFilters['status'],
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
      tripType: req.query.tripType as TripFilters['tripType'],
      upcoming: req.query.upcoming === 'true',
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    };

    const { trips, total } = await tripsService.findAll(filters);

    res.json({
      success: true,
      ...paginate(trips, total, { page: filters.page, limit: filters.limit }),
    });
  });

  getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const trip = await tripsService.findById(req.params.id);

    res.json({
      success: true,
      data: trip,
    });
  });

  create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { centerId } = req.params;
    const trip = await tripsService.create(centerId, req.user!.userId, req.body);

    res.status(201).json({
      success: true,
      message: 'Trip created as draft',
      data: trip,
    });
  });

  update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const trip = await tripsService.update(req.params.id, req.user!.userId, req.body);

    res.json({
      success: true,
      data: trip,
    });
  });

  delete = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await tripsService.delete(req.params.id, req.user!.userId);

    res.json({
      success: true,
      message: 'Trip deleted',
    });
  });

  cancel = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const reason = req.body.reason as string;
    await tripsService.cancel(req.params.id, req.user!.userId, reason);

    res.json({
      success: true,
      message: 'Trip cancelled',
    });
  });

  publish = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const trip = await tripsService.publish(req.params.id, req.user!.userId);

    res.json({
      success: true,
      message: 'Trip published successfully',
      data: trip,
    });
  });

  listInstructors = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const instructors = await tripsService.getInstructors(req.params.id);

    res.json({
      success: true,
      data: instructors,
    });
  });

  addInstructor = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const instructor = await tripsService.addInstructor(
      req.params.id,
      req.user!.userId,
      req.body
    );

    res.status(201).json({
      success: true,
      message: 'Instructor added to trip',
      data: instructor,
    });
  });

  removeInstructor = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await tripsService.removeInstructor(
      req.params.id,
      req.params.instructorId,
      req.user!.userId
    );

    res.json({
      success: true,
      message: 'Instructor removed from trip',
    });
  });
}

export const tripsController = new TripsController();
