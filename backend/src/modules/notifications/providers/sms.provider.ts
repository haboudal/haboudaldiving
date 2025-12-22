import { config } from '../../../config';
import { logger } from '../../../utils/logger';
import { SmsProvider, SmsOptions, SmsResult } from '../notifications.types';

interface TwilioClient {
  messages: {
    create: (params: {
      to: string;
      from: string;
      body: string;
    }) => Promise<{ sid: string }>;
  };
}

class TwilioSmsProvider implements SmsProvider {
  private client: TwilioClient | null = null;
  private mockMode: boolean;
  private fromNumber: string;

  constructor() {
    this.mockMode = config.sms?.mockMode ?? true;
    this.fromNumber = config.sms?.fromNumber || '+1234567890';
    this.initializeClient();
  }

  private async initializeClient(): Promise<void> {
    if (this.mockMode) {
      logger.info('SMS provider running in mock mode');
      return;
    }

    try {
      const accountSid = config.sms?.twilioAccountSid;
      const authToken = config.sms?.twilioAuthToken;

      if (!accountSid || !authToken) {
        logger.warn('Twilio credentials not configured, SMS will be mocked');
        this.mockMode = true;
        return;
      }

      // Dynamic import of Twilio
      const twilio = await import('twilio');
      this.client = twilio.default(accountSid, authToken) as TwilioClient;
      logger.info('Twilio SMS client initialized');
    } catch (error) {
      logger.error('Failed to initialize Twilio client', { error });
      this.mockMode = true;
    }
  }

  async send(options: SmsOptions): Promise<SmsResult> {
    const message = options.template
      ? this.renderTemplate(options.template, options.templateData || {})
      : options.message;

    if (this.mockMode) {
      logger.info('Mock SMS sent', {
        to: options.to,
        message: message.substring(0, 50) + '...',
      });
      return {
        success: true,
        messageId: `mock-sms-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      };
    }

    if (!this.client) {
      logger.error('Twilio client not initialized');
      return {
        success: false,
        error: 'SMS service not configured',
      };
    }

    try {
      const result = await this.client.messages.create({
        to: options.to,
        from: this.fromNumber,
        body: message,
      });

      logger.info('SMS sent successfully', {
        messageId: result.sid,
        to: options.to,
      });

      return {
        success: true,
        messageId: result.sid,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to send SMS', {
        error: errorMessage,
        to: options.to,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async sendBulk(optionsList: SmsOptions[]): Promise<SmsResult[]> {
    const results = await Promise.all(optionsList.map((options) => this.send(options)));
    return results;
  }

  private renderTemplate(
    template: string,
    data: Record<string, unknown>
  ): string {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, String(value));
    }
    return result;
  }
}

export const smsProvider = new TwilioSmsProvider();
