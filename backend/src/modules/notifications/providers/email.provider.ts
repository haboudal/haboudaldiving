import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../../../config';
import { logger } from '../../../utils/logger';
import { EmailProvider, EmailOptions, EmailResult } from '../notifications.types';

class NodemailerEmailProvider implements EmailProvider {
  private transporter: Transporter | null = null;
  private mockMode: boolean;

  constructor() {
    this.mockMode = config.email?.mockMode ?? true;
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    if (this.mockMode) {
      logger.info('Email provider running in mock mode');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: config.email?.host || 'smtp.gmail.com',
        port: config.email?.port || 587,
        secure: config.email?.secure || false,
        auth: {
          user: config.email?.user,
          pass: config.email?.password,
        },
      });

      logger.info('Email transporter initialized');
    } catch (error) {
      logger.error('Failed to initialize email transporter', { error });
    }
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    const recipients = Array.isArray(options.to) ? options.to : [options.to];
    const toAddresses = recipients.map((r) => (r.name ? `${r.name} <${r.email}>` : r.email));

    if (this.mockMode) {
      logger.info('Mock email sent', {
        to: toAddresses,
        subject: options.subject,
      });
      return {
        success: true,
        messageId: `mock-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      };
    }

    if (!this.transporter) {
      logger.error('Email transporter not initialized');
      return {
        success: false,
        error: 'Email service not configured',
      };
    }

    try {
      const mailOptions = {
        from: config.email?.from || 'noreply@divingsaudi.com',
        to: toAddresses.join(', '),
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
        cc: options.cc?.map((r) => (r.name ? `${r.name} <${r.email}>` : r.email)).join(', '),
        bcc: options.bcc?.map((r) => (r.name ? `${r.name} <${r.email}>` : r.email)).join(', '),
        attachments: options.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
        })),
      };

      const info = await this.transporter.sendMail(mailOptions);

      logger.info('Email sent successfully', {
        messageId: info.messageId,
        to: toAddresses,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to send email', {
        error: errorMessage,
        to: toAddresses,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async sendBulk(optionsList: EmailOptions[]): Promise<EmailResult[]> {
    const results = await Promise.all(optionsList.map((options) => this.send(options)));
    return results;
  }

  async verifyConnection(): Promise<boolean> {
    if (this.mockMode) {
      return true;
    }

    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      logger.error('Email connection verification failed', { error });
      return false;
    }
  }
}

export const emailProvider = new NodemailerEmailProvider();
