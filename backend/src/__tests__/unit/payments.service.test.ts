import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before importing the service
vi.mock('../../config/database', () => ({
  db: {
    query: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock('../../config/redis', () => ({
  redis: {
    get: vi.fn(),
    setEx: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../modules/trips/bookings/bookings.service', () => ({
  bookingsService: {
    findById: vi.fn(),
  },
}));

vi.mock('../../modules/centers/centers.service', () => ({
  centersService: {
    verifyOwnership: vi.fn(),
  },
}));

vi.mock('../../modules/payments/hyperpay/hyperpay.service', () => ({
  hyperPayService: {
    prepareCheckout: vi.fn(),
    getPaymentStatus: vi.fn(),
    processRefund: vi.fn(),
    verifyWebhookSignature: vi.fn(),
    getWidgetUrl: vi.fn(() => 'https://widget.hyperpay.com'),
  },
}));

import { PaymentsService } from '../../modules/payments/payments.service';
import { db } from '../../config/database';
import { redis } from '../../config/redis';
import { bookingsService } from '../../modules/trips/bookings/bookings.service';
import { hyperPayService } from '../../modules/payments/hyperpay/hyperpay.service';
import { centersService } from '../../modules/centers/centers.service';

describe('PaymentsService', () => {
  let paymentsService: PaymentsService;

  beforeEach(() => {
    paymentsService = new PaymentsService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findById', () => {
    it('should return payment when found', async () => {
      const mockPayment = {
        id: 'payment-123',
        booking_id: 'booking-123',
        user_id: 'user-123',
        amount_sar: '350.00',
        currency: 'SAR',
        payment_method: 'VISA',
        payment_gateway: 'hyperpay',
        status: 'completed',
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [mockPayment],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await paymentsService.findById('payment-123');

      expect(result.id).toBe('payment-123');
      expect(result.amountSar).toBe(350);
      expect(result.status).toBe('completed');
    });

    it('should throw NotFoundError when payment does not exist', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(paymentsService.findById('non-existent')).rejects.toThrow('not found');
    });
  });

  describe('findByBooking', () => {
    it('should return all payments for a booking', async () => {
      const mockPayments = [
        {
          id: 'payment-1',
          booking_id: 'booking-123',
          user_id: 'user-123',
          amount_sar: '350.00',
          currency: 'SAR',
          payment_method: 'VISA',
          payment_gateway: 'hyperpay',
          status: 'failed',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'payment-2',
          booking_id: 'booking-123',
          user_id: 'user-123',
          amount_sar: '350.00',
          currency: 'SAR',
          payment_method: 'MADA',
          payment_gateway: 'hyperpay',
          status: 'completed',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: mockPayments,
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await paymentsService.findByBooking('booking-123');

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('failed');
      expect(result[1].status).toBe('completed');
    });
  });

  describe('initiateCheckout', () => {
    const mockBooking = {
      id: 'booking-123',
      userId: 'user-123',
      centerId: 'center-123',
      status: 'pending',
      totalAmountSar: 350,
      bookingNumber: 'BK-001',
    };

    it('should throw ForbiddenError if user does not own the booking', async () => {
      vi.mocked(bookingsService.findById).mockResolvedValueOnce({
        ...mockBooking,
        userId: 'other-user',
      } as any);

      await expect(
        paymentsService.initiateCheckout(
          'user-123',
          { bookingId: 'booking-123', paymentMethod: 'VISA', returnUrl: 'https://app.com/callback' },
          '127.0.0.1',
          'Mozilla/5.0'
        )
      ).rejects.toThrow('only pay for your own');
    });

    it('should throw ValidationError for non-payable booking status', async () => {
      vi.mocked(bookingsService.findById).mockResolvedValueOnce({
        ...mockBooking,
        status: 'cancelled',
      } as any);

      await expect(
        paymentsService.initiateCheckout(
          'user-123',
          { bookingId: 'booking-123', paymentMethod: 'VISA', returnUrl: 'https://app.com/callback' },
          '127.0.0.1',
          'Mozilla/5.0'
        )
      ).rejects.toThrow('Cannot pay');
    });

    it('should successfully create checkout', async () => {
      vi.mocked(bookingsService.findById).mockResolvedValueOnce(mockBooking as any);

      // No existing pending payment
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Get user email
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ email: 'user@example.com' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Create payment record
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: 'payment-123' }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      vi.mocked(hyperPayService.prepareCheckout).mockResolvedValueOnce({
        checkoutId: 'checkout-123',
        formUrl: 'https://hyperpay.com/form',
        expiresAt: new Date(Date.now() + 900000),
      });

      vi.mocked(redis.setEx).mockResolvedValueOnce(undefined as unknown as void);

      const result = await paymentsService.initiateCheckout(
        'user-123',
        { bookingId: 'booking-123', paymentMethod: 'VISA', returnUrl: 'https://app.com/callback' },
        '127.0.0.1',
        'Mozilla/5.0'
      );

      expect(result.checkoutId).toBe('checkout-123');
      expect(result.paymentId).toBe('payment-123');
      expect(hyperPayService.prepareCheckout).toHaveBeenCalled();
    });
  });

  describe('processRefund', () => {
    const mockPayment = {
      id: 'payment-123',
      booking_id: 'booking-123',
      user_id: 'user-123',
      amount_sar: '350.00',
      currency: 'SAR',
      payment_method: 'VISA',
      payment_gateway: 'hyperpay',
      gateway_transaction_id: 'txn-123',
      status: 'completed',
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should throw ValidationError if payment is not completed', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ ...mockPayment, status: 'pending' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Mock admin check
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ role: 'admin' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(
        paymentsService.processRefund('payment-123', 'admin-123', { reason: 'Customer request' })
      ).rejects.toThrow('Cannot refund');
    });

    it('should throw ValidationError if refund amount exceeds payment', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [mockPayment],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Mock admin check
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ role: 'admin' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(
        paymentsService.processRefund('payment-123', 'admin-123', { amount: 500, reason: 'Overcharge' })
      ).rejects.toThrow('cannot exceed');
    });

    it('should successfully process full refund', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [mockPayment],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Mock admin check
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ role: 'admin' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      vi.mocked(hyperPayService.processRefund).mockResolvedValueOnce({
        success: true,
        refundId: 'refund-123',
        amount: 350,
        resultCode: '000.000.000',
        resultDescription: 'Request processed',
      });

      // Update payment
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      // Update booking
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      const result = await paymentsService.processRefund('payment-123', 'admin-123', {
        reason: 'Customer request',
      });

      expect(result.refundAmount).toBe(350);
      expect(result.status).toBe('refunded');
      expect(result.refundTransactionId).toBe('refund-123');
    });
  });

  describe('listPayments', () => {
    it('should call database with correct filters', async () => {
      const mockCount = { count: '50' };
      const mockPayments: any[] = [];

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [mockCount],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: mockPayments,
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await paymentsService.listPayments({
        status: 'completed',
        page: 1,
        limit: 20,
      });

      expect(result.total).toBe(50);
      expect(result.payments).toHaveLength(0);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('p.status = $'),
        expect.arrayContaining(['completed'])
      );
    });

    it('should filter by date range', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ count: '10' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await paymentsService.listPayments({
        dateFrom: '2025-01-01',
        dateTo: '2025-01-31',
      });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('p.created_at >='),
        expect.arrayContaining(['2025-01-01', '2025-01-31'])
      );
    });
  });
});
