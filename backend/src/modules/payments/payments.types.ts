// Payment status matching database enum
export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

// Supported payment methods for HyperPay
export type PaymentMethod = 'MADA' | 'VISA' | 'MASTER' | 'APPLEPAY' | 'STC_PAY';

// Core payment entity
export interface Payment {
  id: string;
  bookingId: string;
  userId: string;
  amountSar: number;
  currency: string;
  paymentMethod: PaymentMethod | string;
  paymentGateway: string;
  gatewayTransactionId?: string;
  gatewayResponse?: Record<string, unknown>;
  status: PaymentStatus;
  paidAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  refundedAt?: Date;
  refundAmountSar?: number;
  refundReason?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Payment with booking details for list views
export interface PaymentWithDetails extends Payment {
  bookingNumber?: string;
  tripTitle?: string;
  userName?: string;
  userEmail?: string;
  centerName?: string;
}

// Checkout initiation request
export interface InitiateCheckoutDto {
  bookingId: string;
  paymentMethod: PaymentMethod;
  returnUrl: string;
  cancelUrl?: string;
}

// Checkout initiation response
export interface CheckoutResult {
  checkoutId: string;
  formUrl: string;
  paymentId: string;
  expiresAt: Date;
  widgetUrl: string;
}

// Payment status check request (after form completion)
export interface PaymentStatusDto {
  resourcePath: string;
}

// Refund request
export interface RefundDto {
  amount?: number;
  reason: string;
}

// Refund result
export interface RefundResult {
  paymentId: string;
  refundAmount: number;
  originalAmount: number;
  status: PaymentStatus;
  refundTransactionId?: string;
}

// Webhook payload from HyperPay
export interface WebhookPayload {
  type: string;
  payload: {
    id: string;
    paymentType: string;
    paymentBrand: string;
    amount: string;
    currency: string;
    result: {
      code: string;
      description: string;
    };
    customParameters?: Record<string, string>;
    timestamp: string;
  };
}

// Filters for listing payments
export interface PaymentFilters {
  status?: PaymentStatus;
  bookingId?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}
