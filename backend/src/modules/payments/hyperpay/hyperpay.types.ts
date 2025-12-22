// HyperPay API response for checkout preparation
export interface HyperPayCheckoutResponse {
  result: {
    code: string;
    description: string;
  };
  buildNumber: string;
  timestamp: string;
  ndc: string;
  id: string; // checkoutId
}

// HyperPay payment status response
export interface HyperPayPaymentStatusResponse {
  id: string;
  paymentType: string;
  paymentBrand: string;
  amount: string;
  currency: string;
  descriptor: string;
  merchantTransactionId: string;
  result: {
    code: string;
    description: string;
  };
  resultDetails?: {
    ExtendedDescription?: string;
    AcquirerResponse?: string;
    ConnectorTxID1?: string;
    ConnectorTxID3?: string;
  };
  card?: {
    bin: string;
    last4Digits: string;
    holder: string;
    expiryMonth: string;
    expiryYear: string;
  };
  customer: {
    email: string;
    ip: string;
  };
  billing?: {
    street1: string;
    city: string;
    state: string;
    country: string;
    postcode: string;
  };
  customParameters?: Record<string, string>;
  risk?: {
    score: string;
  };
  timestamp: string;
}

// HyperPay refund response
export interface HyperPayRefundResponse {
  id: string;
  paymentType: string;
  amount: string;
  currency: string;
  result: {
    code: string;
    description: string;
  };
  timestamp: string;
}

// HyperPay result code patterns for success detection
// Success patterns: 000.000.xxx, 000.100.1xx, 000.3xx, 000.6xx
export const HYPERPAY_SUCCESS_PATTERN = /^(000\.000\.|000\.100\.1|000\.[36])/;
// Pending patterns: 000.200.xxx (pending/waiting for external)
export const HYPERPAY_PENDING_PATTERN = /^(000\.200)/;
// Review patterns: manual review required
export const HYPERPAY_REVIEW_PATTERN = /^(000\.400\.0[^3]|000\.400\.100)/;

// Helper to check if result code indicates success
export function isSuccessCode(code: string): boolean {
  return HYPERPAY_SUCCESS_PATTERN.test(code);
}

export function isPendingCode(code: string): boolean {
  return HYPERPAY_PENDING_PATTERN.test(code);
}

export function isReviewCode(code: string): boolean {
  return HYPERPAY_REVIEW_PATTERN.test(code);
}

// Prepare checkout parameters
export interface PrepareCheckoutParams {
  merchantTransactionId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  customerEmail: string;
  customerIp: string;
  billingCity?: string;
  billingCountry?: string;
  returnUrl: string;
  customParameters?: Record<string, string>;
}

// Checkout prepare result
export interface CheckoutPrepareResult {
  checkoutId: string;
  formUrl: string;
  expiresAt: Date;
}

// Payment status result
export interface PaymentStatusResult {
  success: boolean;
  pending: boolean;
  transactionId: string;
  paymentBrand: string;
  amount: number;
  currency: string;
  resultCode: string;
  resultDescription: string;
  cardLastFour?: string;
  rawResponse: HyperPayPaymentStatusResponse;
}

// Refund parameters
export interface RefundParams {
  paymentId: string;
  amount: number;
  currency: string;
}

// Refund result
export interface RefundResult {
  success: boolean;
  refundId: string;
  amount: number;
  resultCode: string;
  resultDescription: string;
}
