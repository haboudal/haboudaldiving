import { config } from '../../../config';
import { logger } from '../../../utils/logger';
import { PushProvider, PushOptions, PushResult } from '../notifications.types';

interface FirebaseMessaging {
  sendEachForMulticast: (message: {
    tokens: string[];
    notification: { title: string; body: string; imageUrl?: string };
    data?: Record<string, string>;
    android?: { priority: string; ttl: number; collapseKey?: string };
    apns?: { payload: { aps: { sound?: string; badge?: number } } };
  }) => Promise<{
    successCount: number;
    failureCount: number;
    responses: Array<{ success: boolean; error?: { message: string } }>;
  }>;
  subscribeToTopic: (tokens: string[], topic: string) => Promise<void>;
  unsubscribeFromTopic: (tokens: string[], topic: string) => Promise<void>;
}

class FCMPushProvider implements PushProvider {
  private messaging: FirebaseMessaging | null = null;
  private mockMode: boolean;

  constructor() {
    this.mockMode = config.firebase?.mockMode ?? true;
    this.initializeFirebase();
  }

  private async initializeFirebase(): Promise<void> {
    if (this.mockMode) {
      logger.info('Push notification provider running in mock mode');
      return;
    }

    try {
      const serviceAccountPath = config.firebase?.serviceAccountPath;

      if (!serviceAccountPath) {
        logger.warn('Firebase service account not configured, push notifications will be mocked');
        this.mockMode = true;
        return;
      }

      // Dynamic import of Firebase Admin
      const admin = await import('firebase-admin');

      if (!admin.apps.length) {
        const serviceAccount = await import(serviceAccountPath);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount.default || serviceAccount),
        });
      }

      this.messaging = admin.messaging() as unknown as FirebaseMessaging;
      logger.info('Firebase Cloud Messaging initialized');
    } catch (error) {
      logger.error('Failed to initialize Firebase', { error });
      this.mockMode = true;
    }
  }

  async send(options: PushOptions): Promise<PushResult> {
    if (this.mockMode) {
      logger.info('Mock push notification sent', {
        tokenCount: options.tokens.length,
        title: options.payload.title,
      });
      return {
        success: true,
        successCount: options.tokens.length,
        failureCount: 0,
        responses: options.tokens.map((token) => ({
          token,
          success: true,
        })),
      };
    }

    if (!this.messaging) {
      logger.error('Firebase messaging not initialized');
      return {
        success: false,
        successCount: 0,
        failureCount: options.tokens.length,
        responses: options.tokens.map((token) => ({
          token,
          success: false,
          error: 'Push service not configured',
        })),
      };
    }

    try {
      const message = {
        tokens: options.tokens,
        notification: {
          title: options.payload.title,
          body: options.payload.body,
          imageUrl: options.payload.image,
        },
        data: options.payload.data,
        android: {
          priority: options.priority === 'high' ? 'high' : 'normal',
          ttl: (options.ttl || 86400) * 1000, // Convert to milliseconds
          collapseKey: options.collapseKey,
        },
        apns: {
          payload: {
            aps: {
              sound: options.payload.sound || 'default',
              badge: options.payload.badge,
            },
          },
        },
      };

      const response = await this.messaging.sendEachForMulticast(message);

      logger.info('Push notifications sent', {
        successCount: response.successCount,
        failureCount: response.failureCount,
      });

      return {
        success: response.failureCount === 0,
        successCount: response.successCount,
        failureCount: response.failureCount,
        responses: options.tokens.map((token, index) => ({
          token,
          success: response.responses[index].success,
          error: response.responses[index].error?.message,
        })),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to send push notifications', { error: errorMessage });

      return {
        success: false,
        successCount: 0,
        failureCount: options.tokens.length,
        responses: options.tokens.map((token) => ({
          token,
          success: false,
          error: errorMessage,
        })),
      };
    }
  }

  async subscribeToTopic(tokens: string[], topic: string): Promise<void> {
    if (this.mockMode) {
      logger.info('Mock: Subscribed tokens to topic', { tokenCount: tokens.length, topic });
      return;
    }

    if (!this.messaging) {
      logger.error('Firebase messaging not initialized');
      return;
    }

    try {
      await this.messaging.subscribeToTopic(tokens, topic);
      logger.info('Subscribed tokens to topic', { tokenCount: tokens.length, topic });
    } catch (error) {
      logger.error('Failed to subscribe to topic', { error, topic });
    }
  }

  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<void> {
    if (this.mockMode) {
      logger.info('Mock: Unsubscribed tokens from topic', { tokenCount: tokens.length, topic });
      return;
    }

    if (!this.messaging) {
      logger.error('Firebase messaging not initialized');
      return;
    }

    try {
      await this.messaging.unsubscribeFromTopic(tokens, topic);
      logger.info('Unsubscribed tokens from topic', { tokenCount: tokens.length, topic });
    } catch (error) {
      logger.error('Failed to unsubscribe from topic', { error, topic });
    }
  }
}

export const pushProvider = new FCMPushProvider();
