import { Request, Response } from 'express';
import { bookingsService } from './bookings.service';
import { asyncHandler, paginate } from '../../../utils/helpers';
import { BookingFilters } from './bookings.types';

export class BookingsController {
  listByTrip = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { tripId } = req.params;
    const filters: BookingFilters = {
      status: req.query.status as BookingFilters['status'],
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    };

    const { bookings, total } = await bookingsService.findByTrip(tripId, filters);

    res.json({
      success: true,
      ...paginate(bookings, total, { page: filters.page, limit: filters.limit }),
    });
  });

  getMyBookings = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const filters: BookingFilters = {
      status: req.query.status as BookingFilters['status'],
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    };

    const { bookings, total } = await bookingsService.findByUser(req.user!.userId, filters);

    res.json({
      success: true,
      ...paginate(bookings, total, { page: filters.page, limit: filters.limit }),
    });
  });

  getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const booking = await bookingsService.verifyBookingAccess(req.params.id, req.user!.userId);

    res.json({
      success: true,
      data: booking,
    });
  });

  create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { tripId } = req.params;
    const result = await bookingsService.create(tripId, req.user!.userId, req.body);

    if (result.waitingList) {
      res.status(202).json({
        success: true,
        message: 'Trip is full. You have been added to the waiting list.',
        data: { position: result.position },
      });
      return;
    }

    const message = result.parentConsentRequired
      ? 'Booking created. Awaiting parent consent.'
      : 'Booking created successfully';

    res.status(201).json({
      success: true,
      message,
      data: result.booking,
    });
  });

  update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const booking = await bookingsService.update(req.params.id, req.user!.userId, req.body);

    res.json({
      success: true,
      data: booking,
    });
  });

  cancel = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = await bookingsService.cancel(req.params.id, req.user!.userId, req.body);

    res.json({
      success: true,
      message: 'Booking cancelled',
      data: { refundAmount: result.refundAmount },
    });
  });

  checkIn = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const booking = await bookingsService.checkIn(req.params.id, req.user!.userId);

    res.json({
      success: true,
      message: 'Diver checked in successfully',
      data: booking,
    });
  });

  signWaiver = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const booking = await bookingsService.signWaiver(req.params.id, req.user!.userId, ipAddress);

    res.json({
      success: true,
      message: 'Waiver signed successfully',
      data: booking,
    });
  });

  joinWaitingList = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { tripId } = req.params;
    const position = await bookingsService.joinWaitingList(tripId, req.user!.userId);

    res.status(201).json({
      success: true,
      message: 'Added to waiting list',
      data: { position },
    });
  });

  leaveWaitingList = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { tripId } = req.params;
    await bookingsService.leaveWaitingList(tripId, req.user!.userId);

    res.json({
      success: true,
      message: 'Removed from waiting list',
    });
  });

  getWaitingList = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { tripId } = req.params;
    const waitingList = await bookingsService.getWaitingList(tripId);

    res.json({
      success: true,
      data: waitingList,
    });
  });

  checkEligibility = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { tripId } = req.params;
    const { tripsService } = await import('../trips.service');
    const trip = await tripsService.findById(tripId);
    const eligibility = await bookingsService.checkDiverEligibility(req.user!.userId, trip);

    res.json({
      success: true,
      data: eligibility,
    });
  });

  calculatePrice = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { tripId } = req.params;
    const { tripsService } = await import('../trips.service');
    const trip = await tripsService.findById(tripId);
    const pricing = await bookingsService.calculateBookingPrice(trip, req.body);

    res.json({
      success: true,
      data: pricing,
    });
  });
}

export const bookingsController = new BookingsController();
