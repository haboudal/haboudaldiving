import axios, { AxiosInstance, AxiosError } from 'axios';
import crypto from 'crypto';
import { hyperPayConfig } from './hyperpay.config';
import {
  HyperPayCheckoutResponse,
  HyperPayPaymentStatusResponse,
  HyperPayRefundResponse,
  PrepareCheckoutParams,
  CheckoutPrepareResult,
  PaymentStatusResult,
  RefundParams,
  RefundResult,
  isSuccessCode,
  isPendingCode,
} from './hyperpay.types';
import { logger } from '../../../utils/logger';
import { ExternalServiceError, ValidationError } from '../../../utils/errors';

export class HyperPayService {
  private client: AxiosInstance;
  private formBaseUrl: string;

  constructor() {
    this.client = axios.create({
      baseURL: `${hyperPayConfig.baseUrl}/${hyperPayConfig.apiVersion}`,
      timeout: hyperPayConfig.timeout,
      headers: {
        Authorization: `Bearer ${hyperPayConfig.accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    // Form URL for payment page
    this.formBaseUrl = hyperPayConfig.testMode
      ? 'https://eu-test.oppwa.com/v1/paymentWidgets.js'
      : 'https://eu-prod.oppwa.com/v1/paymentWidgets.js';

    // Log configuration (without sensitive data)
    logger.info('HyperPay service initialized', {
      baseUrl: hyperPayConfig.baseUrl,
      testMode: hyperPayConfig.testMode,
    });
  }

  /**
   * Step 1: Prepare checkout - creates a checkout session with HyperPay
   */
  async prepareCheckout(params: PrepareCheckoutParams): Promise<CheckoutPrepareResult> {
    const entityId = hyperPayConfig.entityIds[params.paymentMethod as keyof typeof hyperPayConfig.entityIds];
    if (!entityId) {
      throw new ValidationError(`Unsupported payment method: ${params.paymentMethod}`);
    }

    // Format amount to 2 decimal places
    const formattedAmount = params.amount.toFixed(2);

    // Build form data
    const formData = new URLSearchParams();
    formData.append('entityId', entityId);
    formData.append('amount', formattedAmount);
    formData.append('currency', params.currency);
    formData.append('paymentType', 'DB'); // Debit (capture immediately)
    formData.append('merchantTransactionId', params.merchantTransactionId);

    // Customer info
    formData.append('customer.email', params.customerEmail);
    formData.append('customer.ip', params.customerIp);

    // Billing (optional)
    if (params.billingCity) {
      formData.append('billing.city', params.billingCity);
    }
    formData.append('billing.country', params.billingCountry || 'SA');

    // Custom parameters for webhook identification
    if (params.customParameters) {
      for (const [key, value] of Object.entries(params.customParameters)) {
        formData.append(`customParameters[${key}]`, value);
      }
    }

    // Always include internal payment ID for webhook matching
    formData.append('customParameters[paymentId]', params.merchantTransactionId);

    try {
      logger.info('Preparing HyperPay checkout', {
        merchantTransactionId: params.merchantTransactionId,
        amount: formattedAmount,
        paymentMethod: params.paymentMethod,
      });

      const response = await this.client.post<HyperPayCheckoutResponse>(
        '/checkouts',
        formData.toString()
      );

      const checkoutId = response.data.id;
      const expiresAt = new Date(
        Date.now() + hyperPayConfig.checkoutExpirationMinutes * 60 * 1000
      );

      // Build the form URL with checkout ID
      const formUrl = `${params.returnUrl}?checkoutId=${checkoutId}`;

      logger.info('HyperPay checkout prepared', {
        checkoutId,
        resultCode: response.data.result.code,
      });

      return {
        checkoutId,
        formUrl,
        expiresAt,
      };
    } catch (error) {
      this.handleApiError(error as AxiosError, 'prepareCheckout');
      throw error; // Never reached, handleApiError always throws
    }
  }

  /**
   * Step 2: Get payment status after customer completes form
   */
  async getPaymentStatus(resourcePath: string): Promise<PaymentStatusResult> {
    // resourcePath comes from HyperPay redirect, e.g., "/v1/checkouts/{checkoutId}/payment"
    // We need to append entityId for the request

    // Extract the base entity ID (use VISA as default for status check)
    const entityId = hyperPayConfig.entityIds.VISA;

    try {
      logger.info('Fetching HyperPay payment status', { resourcePath });

      // Remove leading /v1 if present since we already have it in baseURL
      const cleanPath = resourcePath.replace(/^\/v1/, '');

      const response = await this.client.get<HyperPayPaymentStatusResponse>(
        `${cleanPath}?entityId=${entityId}`
      );

      const data = response.data;
      const success = isSuccessCode(data.result.code);
      const pending = isPendingCode(data.result.code);

      logger.info('HyperPay payment status received', {
        transactionId: data.id,
        resultCode: data.result.code,
        success,
        pending,
      });

      return {
        success,
        pending,
        transactionId: data.id,
        paymentBrand: data.paymentBrand,
        amount: parseFloat(data.amount),
        currency: data.currency,
        resultCode: data.result.code,
        resultDescription: data.result.description,
        cardLastFour: data.card?.last4Digits,
        rawResponse: data,
      };
    } catch (error) {
      this.handleApiError(error as AxiosError, 'getPaymentStatus');
      throw error;
    }
  }

  /**
   * Process refund for a completed payment
   */
  async processRefund(params: RefundParams): Promise<RefundResult> {
    const entityId = hyperPayConfig.entityIds.VISA; // Use default entity for refunds
    const formattedAmount = params.amount.toFixed(2);

    const formData = new URLSearchParams();
    formData.append('entityId', entityId);
    formData.append('amount', formattedAmount);
    formData.append('currency', params.currency);
    formData.append('paymentType', 'RF'); // Refund

    try {
      logger.info('Processing HyperPay refund', {
        paymentId: params.paymentId,
        amount: formattedAmount,
      });

      const response = await this.client.post<HyperPayRefundResponse>(
        `/payments/${params.paymentId}`,
        formData.toString()
      );

      const success = isSuccessCode(response.data.result.code);

      logger.info('HyperPay refund processed', {
        refundId: response.data.id,
        resultCode: response.data.result.code,
        success,
      });

      return {
        success,
        refundId: response.data.id,
        amount: parseFloat(response.data.amount),
        resultCode: response.data.result.code,
        resultDescription: response.data.result.description,
      };
    } catch (error) {
      this.handleApiError(error as AxiosError, 'processRefund');
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', hyperPayConfig.webhookSecret)
      .update(payload)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch {
      return false;
    }
  }

  /**
   * Get the JavaScript widget URL for embedding payment form
   */
  getWidgetUrl(): string {
    return this.formBaseUrl;
  }

  /**
   * Get entity ID for a payment method
   */
  getEntityId(paymentMethod: string): string {
    return hyperPayConfig.entityIds[paymentMethod as keyof typeof hyperPayConfig.entityIds];
  }

  /**
   * Check if service is in test mode
   */
  isTestMode(): boolean {
    return hyperPayConfig.testMode;
  }

  private handleApiError(error: AxiosError, operation: string): never {
    const responseData = error.response?.data as Record<string, unknown> | undefined;

    logger.error(`HyperPay ${operation} failed`, {
      status: error.response?.status,
      data: responseData,
      message: error.message,
    });

    if (error.response) {
      const resultCode = (responseData?.result as { code?: string })?.code;
      const resultDescription = (responseData?.result as { description?: string })?.description;

      throw new ExternalServiceError(
        'HyperPay',
        `Payment gateway error: ${resultDescription || error.message} (${resultCode || error.response.status})`
      );
    }

    throw new ExternalServiceError('HyperPay', `Connection failed: ${error.message}`);
  }
}

export const hyperPayService = new HyperPayService();
