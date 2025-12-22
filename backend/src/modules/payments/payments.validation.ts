import { z } from 'zod';

// Valid payment methods for HyperPay
const paymentMethodEnum = z.enum(['MADA', 'VISA', 'MASTER', 'APPLEPAY', 'STC_PAY']);

// Payment status enum
const paymentStatusEnum = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
  'refunded',
  'partially_refunded',
]);

// Checkout initiation schema
export const initiateCheckoutSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID'),
  paymentMethod: paymentMethodEnum,
  returnUrl: z.string().url('Invalid return URL'),
  cancelUrl: z.string().url('Invalid cancel URL').optional(),
});

// Payment status check schema (after form completion)
export const paymentStatusSchema = z.object({
  resourcePath: z.string().min(1, 'Resource path is required'),
});

// Refund request schema
export const refundSchema = z.object({
  amount: z.number().positive('Refund amount must be positive').optional(),
  reason: z.string().min(1, 'Refund reason is required').max(500),
});

// Query params for listing payments
export const paymentListQuerySchema = z.object({
  status: paymentStatusEnum.optional(),
  bookingId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// UUID param validation
export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

export const bookingIdParamSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID format'),
});

export const checkoutIdParamSchema = z.object({
  checkoutId: z.string().min(1, 'Checkout ID is required'),
});

// Inferred types
export type InitiateCheckoutInput = z.infer<typeof initiateCheckoutSchema>;
export type PaymentStatusInput = z.infer<typeof paymentStatusSchema>;
export type RefundInput = z.infer<typeof refundSchema>;
export type PaymentListQueryInput = z.infer<typeof paymentListQuerySchema>;
