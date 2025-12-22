import { Request, Response } from 'express';
import { paymentsService } from './payments.service';
import { asyncHandler, paginate } from '../../utils/helpers';
import { InitiateCheckoutDto, RefundDto, PaymentFilters } from './payments.types';

export class PaymentsController {
  /**
   * POST /payments/checkout
   * Initiate payment checkout for a booking
   */
  initiateCheckout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as InitiateCheckoutDto;
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';

    const result = await paymentsService.initiateCheckout(
      req.user!.userId,
      dto,
      ipAddress,
      userAgent
    );

    res.status(201).json({
      success: true,
      message: 'Checkout initiated successfully',
      data: result,
    });
  });

  /**
   * GET /payments/status/:checkoutId
   * Get payment status after customer completes form
   */
  getPaymentStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { resourcePath } = req.query as { resourcePath: string };

    const payment = await paymentsService.getPaymentStatus(resourcePath);

    res.json({
      success: true,
      data: payment,
    });
  });

  /**
   * POST /payments/webhook
   * Handle HyperPay webhook notifications
   */
  handleWebhook = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const signature = req.get('X-Hyperpay-Signature') || '';
    const rawBody = JSON.stringify(req.body);

    await paymentsService.handleWebhook(req.body, signature, rawBody);

    // Always respond 200 to acknowledge receipt
    res.status(200).json({ received: true });
  });

  /**
   * GET /payments/:id
   * Get payment details
   */
  getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const payment = await paymentsService.findByIdWithDetails(req.params.id);

    // Verify access (owner or admin)
    if (payment.userId !== req.user!.userId && req.user!.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied' },
      });
      return;
    }

    res.json({
      success: true,
      data: payment,
    });
  });

  /**
   * GET /payments/my
   * List user's payment history
   */
  getMyPayments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const filters: PaymentFilters = {
      status: req.query.status as PaymentFilters['status'],
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    };

    const { payments, total } = await paymentsService.findByUser(req.user!.userId, filters);

    res.json({
      success: true,
      ...paginate(payments, total, { page: filters.page, limit: filters.limit }),
    });
  });

  /**
   * GET /payments/booking/:bookingId
   * Get payments for a booking
   */
  getByBooking = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const payments = await paymentsService.findByBooking(req.params.bookingId);

    res.json({
      success: true,
      data: payments,
    });
  });

  /**
   * POST /payments/:id/refund
   * Process refund for a payment
   */
  processRefund = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as RefundDto;

    const result = await paymentsService.processRefund(req.params.id, req.user!.userId, dto);

    res.json({
      success: true,
      message: 'Refund processed successfully',
      data: result,
    });
  });

  /**
   * GET /payments (Admin)
   * List all payments with filters
   */
  listPayments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const filters: PaymentFilters = {
      status: req.query.status as PaymentFilters['status'],
      bookingId: req.query.bookingId as string,
      userId: req.query.userId as string,
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    };

    const { payments, total } = await paymentsService.listPayments(filters);

    res.json({
      success: true,
      ...paginate(payments, total, { page: filters.page, limit: filters.limit }),
    });
  });
}

export const paymentsController = new PaymentsController();
