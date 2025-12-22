import { db } from '../../config/database';
import { redis } from '../../config/redis';
import { NotFoundError, ForbiddenError, ValidationError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { hyperPayService } from './hyperpay/hyperpay.service';
import { isSuccessCode } from './hyperpay/hyperpay.types';
import {
  Payment,
  PaymentWithDetails,
  PaymentStatus,
  PaymentMethod,
  InitiateCheckoutDto,
  CheckoutResult,
  RefundDto,
  RefundResult,
  PaymentFilters,
  WebhookPayload,
} from './payments.types';
import { bookingsService } from '../trips/bookings/bookings.service';
import { centersService } from '../centers/centers.service';

// Cache TTL for checkout sessions (15 minutes)
const CHECKOUT_CACHE_TTL = 15 * 60;

export class PaymentsService {
  /**
   * Initiate payment checkout for a booking
   */
  async initiateCheckout(
    userId: string,
    dto: InitiateCheckoutDto,
    ipAddress: string,
    userAgent: string
  ): Promise<CheckoutResult> {
    // Verify booking exists and belongs to user
    const booking = await bookingsService.findById(dto.bookingId);

    if (booking.userId !== userId) {
      throw new ForbiddenError('You can only pay for your own bookings');
    }

    // Verify booking is in payable state
    if (!['pending', 'confirmed'].includes(booking.status)) {
      throw new ValidationError(`Cannot pay for a booking with status: ${booking.status}`);
    }

    // Check for existing pending payment
    const existingPayment = await this.findPendingPaymentForBooking(dto.bookingId);
    if (existingPayment) {
      // Return existing checkout if still valid
      const cachedCheckout = await this.getCachedCheckout(existingPayment.id);
      if (cachedCheckout) {
        return cachedCheckout;
      }
      // Mark old payment as failed
      await this.updatePaymentStatus(existingPayment.id, 'failed', {
        failureReason: 'Checkout expired or replaced',
      });
    }

    // Get user email for HyperPay
    const userResult = await db.query<{ email: string }>(
      'SELECT email FROM users WHERE id = $1',
      [userId]
    );
    const customerEmail = userResult.rows[0]?.email || '';

    // Create payment record
    const paymentId = await this.createPaymentRecord({
      bookingId: dto.bookingId,
      userId,
      amountSar: booking.totalAmountSar,
      paymentMethod: dto.paymentMethod,
      ipAddress,
      userAgent,
    });

    // Prepare HyperPay checkout
    const checkoutResult = await hyperPayService.prepareCheckout({
      merchantTransactionId: paymentId,
      amount: booking.totalAmountSar,
      currency: 'SAR',
      paymentMethod: dto.paymentMethod,
      customerEmail,
      customerIp: ipAddress,
      billingCountry: 'SA',
      returnUrl: dto.returnUrl,
      customParameters: {
        bookingId: dto.bookingId,
        bookingNumber: booking.bookingNumber,
      },
    });

    const result: CheckoutResult = {
      checkoutId: checkoutResult.checkoutId,
      formUrl: checkoutResult.formUrl,
      paymentId,
      expiresAt: checkoutResult.expiresAt,
      widgetUrl: hyperPayService.getWidgetUrl(),
    };

    // Cache checkout info for status retrieval
    await this.cacheCheckout(paymentId, result);

    logger.info('Payment checkout initiated', {
      paymentId,
      bookingId: dto.bookingId,
      amount: booking.totalAmountSar,
      paymentMethod: dto.paymentMethod,
    });

    return result;
  }

  /**
   * Get payment status after customer completes form
   */
  async getPaymentStatus(resourcePath: string): Promise<Payment> {
    // Get payment status from HyperPay
    const status = await hyperPayService.getPaymentStatus(resourcePath);

    // Find payment by merchant transaction ID (which is the payment ID)
    const payment = await this.findPaymentByMerchantId(
      status.rawResponse.merchantTransactionId
    );

    if (!payment) {
      throw new NotFoundError('Payment');
    }

    // Update payment based on status
    if (status.success) {
      await this.markPaymentCompleted(payment.id, status.transactionId, status.rawResponse);

      // Update booking status to 'paid'
      await db.query(
        `UPDATE bookings SET status = 'paid', updated_at = NOW() WHERE id = $1`,
        [payment.bookingId]
      );

      logger.info('Payment completed successfully', {
        paymentId: payment.id,
        bookingId: payment.bookingId,
        transactionId: status.transactionId,
      });
    } else if (status.pending) {
      await this.updatePaymentStatus(payment.id, 'processing', {
        gatewayTransactionId: status.transactionId,
        gatewayResponse: status.rawResponse,
      });
    } else {
      await this.updatePaymentStatus(payment.id, 'failed', {
        gatewayTransactionId: status.transactionId,
        gatewayResponse: status.rawResponse,
        failureReason: status.resultDescription,
      });

      logger.warn('Payment failed', {
        paymentId: payment.id,
        resultCode: status.resultCode,
        resultDescription: status.resultDescription,
      });
    }

    return this.findById(payment.id);
  }

  /**
   * Handle HyperPay webhook notification
   */
  async handleWebhook(
    payload: WebhookPayload,
    signature: string,
    rawBody: string
  ): Promise<void> {
    // Verify signature
    if (!hyperPayService.verifyWebhookSignature(rawBody, signature)) {
      logger.warn('Invalid webhook signature');
      throw new ValidationError('Invalid webhook signature');
    }

    const { id, result, customParameters } = payload.payload;
    const paymentId = customParameters?.paymentId;

    if (!paymentId) {
      logger.warn('Webhook missing paymentId', { transactionId: id });
      return;
    }

    let payment: Payment;
    try {
      payment = await this.findById(paymentId);
    } catch {
      logger.warn('Payment not found for webhook', { paymentId, transactionId: id });
      return;
    }

    // Process based on result code
    const isSuccess = isSuccessCode(result.code);

    if (isSuccess && payment.status === 'processing') {
      await this.markPaymentCompleted(paymentId, id, payload.payload);

      // Update booking status
      await db.query(
        `UPDATE bookings SET status = 'paid', updated_at = NOW() WHERE id = $1`,
        [payment.bookingId]
      );

      logger.info('Payment completed via webhook', {
        paymentId,
        transactionId: id,
      });
    } else if (!isSuccess && payment.status === 'processing') {
      await this.updatePaymentStatus(paymentId, 'failed', {
        gatewayTransactionId: id,
        gatewayResponse: payload.payload,
        failureReason: result.description,
      });

      logger.info('Payment failed via webhook', {
        paymentId,
        resultCode: result.code,
      });
    }
  }

  /**
   * Process refund for a payment
   */
  async processRefund(
    paymentId: string,
    userId: string,
    dto: RefundDto
  ): Promise<RefundResult> {
    const payment = await this.findById(paymentId);

    // Verify authorization (admin or center owner)
    const isAdmin = await this.isUserAdmin(userId);
    if (!isAdmin) {
      // Check if user is center owner
      const booking = await bookingsService.findById(payment.bookingId);
      await centersService.verifyOwnership(booking.centerId, userId);
    }

    // Verify payment is in refundable state
    if (payment.status !== 'completed') {
      throw new ValidationError(`Cannot refund a payment with status: ${payment.status}`);
    }

    // Calculate refund amount
    const refundAmount = dto.amount || payment.amountSar;
    if (refundAmount > payment.amountSar) {
      throw new ValidationError('Refund amount cannot exceed original payment amount');
    }

    // Check for existing partial refunds
    const existingRefund = payment.refundAmountSar || 0;
    const maxRefundable = payment.amountSar - existingRefund;
    if (refundAmount > maxRefundable) {
      throw new ValidationError(`Maximum refundable amount is ${maxRefundable} SAR`);
    }

    // Process refund with HyperPay
    const refundResult = await hyperPayService.processRefund({
      paymentId: payment.gatewayTransactionId!,
      amount: refundAmount,
      currency: 'SAR',
    });

    if (!refundResult.success) {
      throw new ValidationError(`Refund failed: ${refundResult.resultDescription}`);
    }

    // Determine new status
    const totalRefunded = existingRefund + refundAmount;
    const newStatus: PaymentStatus =
      totalRefunded >= payment.amountSar ? 'refunded' : 'partially_refunded';

    // Update payment record
    await db.query(
      `UPDATE payments SET
        status = $2,
        refund_amount_sar = $3,
        refund_reason = $4,
        refunded_at = NOW(),
        updated_at = NOW()
      WHERE id = $1`,
      [paymentId, newStatus, totalRefunded, dto.reason]
    );

    // Update booking refund amount
    await db.query(
      `UPDATE bookings SET
        refund_amount_sar = COALESCE(refund_amount_sar, 0) + $2,
        status = CASE
          WHEN $3 = 'refunded' THEN 'refunded'::booking_status
          ELSE status
        END,
        updated_at = NOW()
      WHERE id = $1`,
      [payment.bookingId, refundAmount, newStatus]
    );

    logger.info('Refund processed', {
      paymentId,
      refundAmount,
      totalRefunded,
      newStatus,
    });

    return {
      paymentId,
      refundAmount,
      originalAmount: payment.amountSar,
      status: newStatus,
      refundTransactionId: refundResult.refundId,
    };
  }

  /**
   * Find payment by ID
   */
  async findById(paymentId: string): Promise<Payment> {
    const result = await db.query(`SELECT * FROM payments WHERE id = $1`, [paymentId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Payment');
    }

    return this.mapToPayment(result.rows[0]);
  }

  /**
   * Find payment with details
   */
  async findByIdWithDetails(paymentId: string): Promise<PaymentWithDetails> {
    const result = await db.query(
      `SELECT p.*,
        b.booking_number,
        t.title_en AS trip_title,
        u.email AS user_email,
        CONCAT(dp.first_name_en, ' ', dp.last_name_en) AS user_name,
        dc.name_en AS center_name
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN trips t ON b.trip_id = t.id
      JOIN users u ON p.user_id = u.id
      LEFT JOIN diver_profiles dp ON u.id = dp.user_id
      JOIN diving_centers dc ON b.center_id = dc.id
      WHERE p.id = $1`,
      [paymentId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Payment');
    }

    return this.mapToPaymentWithDetails(result.rows[0]);
  }

  /**
   * List payments for a booking
   */
  async findByBooking(bookingId: string): Promise<Payment[]> {
    const result = await db.query(
      `SELECT * FROM payments WHERE booking_id = $1 ORDER BY created_at DESC`,
      [bookingId]
    );

    return result.rows.map(this.mapToPayment);
  }

  /**
   * List user's payment history
   */
  async findByUser(
    userId: string,
    filters: PaymentFilters
  ): Promise<{ payments: PaymentWithDetails[]; total: number }> {
    return this.listPayments({ ...filters, userId });
  }

  /**
   * List all payments (admin)
   */
  async listPayments(
    filters: PaymentFilters
  ): Promise<{ payments: PaymentWithDetails[]; total: number }> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters.status) {
      conditions.push(`p.status = $${paramIndex++}`);
      params.push(filters.status);
    }

    if (filters.bookingId) {
      conditions.push(`p.booking_id = $${paramIndex++}`);
      params.push(filters.bookingId);
    }

    if (filters.userId) {
      conditions.push(`p.user_id = $${paramIndex++}`);
      params.push(filters.userId);
    }

    if (filters.dateFrom) {
      conditions.push(`p.created_at >= $${paramIndex++}`);
      params.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      conditions.push(`p.created_at <= $${paramIndex++}`);
      params.push(filters.dateTo);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query
    const countResult = await db.query<{ count: string }>(
      `SELECT COUNT(*) FROM payments p ${whereClause}`,
      params
    );

    // Data query
    params.push(limit, offset);
    const result = await db.query(
      `SELECT p.*,
        b.booking_number,
        t.title_en AS trip_title,
        u.email AS user_email,
        CONCAT(dp.first_name_en, ' ', dp.last_name_en) AS user_name,
        dc.name_en AS center_name
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN trips t ON b.trip_id = t.id
      JOIN users u ON p.user_id = u.id
      LEFT JOIN diver_profiles dp ON u.id = dp.user_id
      JOIN diving_centers dc ON b.center_id = dc.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params
    );

    return {
      payments: result.rows.map(this.mapToPaymentWithDetails),
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  // Private helper methods

  private async createPaymentRecord(params: {
    bookingId: string;
    userId: string;
    amountSar: number;
    paymentMethod: PaymentMethod;
    ipAddress: string;
    userAgent: string;
  }): Promise<string> {
    const result = await db.query<{ id: string }>(
      `INSERT INTO payments (
        booking_id, user_id, amount_sar, currency,
        payment_method, payment_gateway, status,
        ip_address, user_agent
      ) VALUES ($1, $2, $3, 'SAR', $4, 'hyperpay', 'pending', $5, $6)
      RETURNING id`,
      [
        params.bookingId,
        params.userId,
        params.amountSar,
        params.paymentMethod,
        params.ipAddress,
        params.userAgent,
      ]
    );

    return result.rows[0].id;
  }

  private async findPendingPaymentForBooking(bookingId: string): Promise<Payment | null> {
    const result = await db.query(
      `SELECT * FROM payments
       WHERE booking_id = $1 AND status IN ('pending', 'processing')
       ORDER BY created_at DESC LIMIT 1`,
      [bookingId]
    );

    return result.rows.length > 0 ? this.mapToPayment(result.rows[0]) : null;
  }

  private async findPaymentByMerchantId(merchantId: string): Promise<Payment | null> {
    const result = await db.query(`SELECT * FROM payments WHERE id = $1`, [merchantId]);

    return result.rows.length > 0 ? this.mapToPayment(result.rows[0]) : null;
  }

  private async markPaymentCompleted(
    paymentId: string,
    transactionId: string,
    gatewayResponse: unknown
  ): Promise<void> {
    await db.query(
      `UPDATE payments SET
        status = 'completed',
        gateway_transaction_id = $2,
        gateway_response = $3,
        paid_at = NOW(),
        updated_at = NOW()
      WHERE id = $1`,
      [paymentId, transactionId, JSON.stringify(gatewayResponse)]
    );
  }

  private async updatePaymentStatus(
    paymentId: string,
    status: PaymentStatus,
    updates: {
      gatewayTransactionId?: string;
      gatewayResponse?: unknown;
      failureReason?: string;
    }
  ): Promise<void> {
    const sets: string[] = ['status = $2', 'updated_at = NOW()'];
    const params: unknown[] = [paymentId, status];
    let paramIndex = 3;

    if (updates.gatewayTransactionId) {
      sets.push(`gateway_transaction_id = $${paramIndex++}`);
      params.push(updates.gatewayTransactionId);
    }

    if (updates.gatewayResponse) {
      sets.push(`gateway_response = $${paramIndex++}`);
      params.push(JSON.stringify(updates.gatewayResponse));
    }

    if (updates.failureReason) {
      sets.push(`failure_reason = $${paramIndex++}`);
      sets.push(`failed_at = NOW()`);
      params.push(updates.failureReason);
    }

    await db.query(`UPDATE payments SET ${sets.join(', ')} WHERE id = $1`, params);
  }

  private async cacheCheckout(paymentId: string, result: CheckoutResult): Promise<void> {
    try {
      await redis.setEx(`checkout:${paymentId}`, CHECKOUT_CACHE_TTL, JSON.stringify(result));
    } catch (error) {
      logger.warn('Failed to cache checkout', { error });
    }
  }

  private async getCachedCheckout(paymentId: string): Promise<CheckoutResult | null> {
    try {
      const cached = await redis.get(`checkout:${paymentId}`);
      if (cached) {
        const result = JSON.parse(cached) as CheckoutResult;
        // Check if not expired
        if (new Date(result.expiresAt) > new Date()) {
          return result;
        }
      }
    } catch (error) {
      logger.warn('Failed to get cached checkout', { error });
    }
    return null;
  }

  private async isUserAdmin(userId: string): Promise<boolean> {
    const result = await db.query<{ role: string }>(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0]?.role === 'admin';
  }

  private mapToPayment(row: Record<string, unknown>): Payment {
    return {
      id: row.id as string,
      bookingId: row.booking_id as string,
      userId: row.user_id as string,
      amountSar: parseFloat(row.amount_sar as string),
      currency: row.currency as string,
      paymentMethod: row.payment_method as string,
      paymentGateway: row.payment_gateway as string,
      gatewayTransactionId: row.gateway_transaction_id as string | undefined,
      gatewayResponse: row.gateway_response as Record<string, unknown> | undefined,
      status: row.status as PaymentStatus,
      paidAt: row.paid_at as Date | undefined,
      failedAt: row.failed_at as Date | undefined,
      failureReason: row.failure_reason as string | undefined,
      refundedAt: row.refunded_at as Date | undefined,
      refundAmountSar: row.refund_amount_sar
        ? parseFloat(row.refund_amount_sar as string)
        : undefined,
      refundReason: row.refund_reason as string | undefined,
      ipAddress: row.ip_address as string | undefined,
      userAgent: row.user_agent as string | undefined,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  private mapToPaymentWithDetails(row: Record<string, unknown>): PaymentWithDetails {
    return {
      ...this.mapToPayment(row),
      bookingNumber: row.booking_number as string | undefined,
      tripTitle: row.trip_title as string | undefined,
      userName: row.user_name as string | undefined,
      userEmail: row.user_email as string | undefined,
      centerName: row.center_name as string | undefined,
    };
  }
}

export const paymentsService = new PaymentsService();
