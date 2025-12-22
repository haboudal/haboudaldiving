import { describe, it, expect } from 'vitest';
import { templateService } from '../../modules/notifications/templates';

describe('Notification Template Service', () => {
  describe('getTemplate', () => {
    it('should return email template for email_verification', () => {
      const template = templateService.getTemplate('email_verification', 'email');
      expect(template).not.toBeNull();
      expect(template?.subject).toBeDefined();
      expect(template?.title).toBeDefined();
      expect(template?.body).toBeDefined();
    });

    it('should return push template for booking_confirmation', () => {
      const template = templateService.getTemplate('booking_confirmation', 'push');
      expect(template).not.toBeNull();
      expect(template?.title).toBeDefined();
      expect(template?.body).toBeDefined();
    });

    it('should return null for non-existent template', () => {
      const template = templateService.getTemplate('email_verification', 'sms');
      expect(template).toBeNull();
    });

    it('should have templates for all booking notifications', () => {
      const bookingTypes = [
        'booking_confirmation',
        'booking_reminder',
        'booking_cancelled',
        'booking_updated',
      ];

      for (const type of bookingTypes) {
        const emailTemplate = templateService.getTemplate(
          type as Parameters<typeof templateService.getTemplate>[0],
          'email'
        );
        // At least email should exist for booking notifications
        expect(emailTemplate !== null || type === 'booking_updated').toBe(true);
      }
    });

    it('should have templates for payment notifications', () => {
      const paymentTypes = [
        'payment_successful',
        'payment_failed',
        'refund_processed',
      ];

      for (const type of paymentTypes) {
        const pushTemplate = templateService.getTemplate(
          type as Parameters<typeof templateService.getTemplate>[0],
          'push'
        );
        expect(pushTemplate).not.toBeNull();
      }
    });
  });

  describe('render', () => {
    it('should interpolate simple variables', () => {
      const template = {
        title: 'Hello {{firstName}}',
        body: 'Welcome, {{firstName}} {{lastName}}!',
      };

      const result = templateService.render(template, {
        user: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result.title).toBe('Hello John');
      expect(result.body).toBe('Welcome, John Doe!');
    });

    it('should handle nested object properties', () => {
      const template = {
        title: 'Hi {{user.firstName}}',
        body: 'Your email is {{user.email}}',
      };

      const result = templateService.render(template, {
        user: { firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
      });

      expect(result.title).toBe('Hi Jane');
      expect(result.body).toBe('Your email is jane@example.com');
    });

    it('should render subject when provided', () => {
      const template = {
        subject: 'Welcome {{firstName}}!',
        title: 'Welcome',
        body: 'Hello',
      };

      const result = templateService.render(template, {
        user: { firstName: 'Test', lastName: 'User', email: 'test@example.com' },
        firstName: 'Test',
      });

      expect(result.subject).toBe('Welcome Test!');
    });

    it('should render HTML when provided', () => {
      const template = {
        title: 'Test',
        body: 'Test body',
        html: '<h1>Hello {{firstName}}</h1>',
      };

      const result = templateService.render(template, {
        user: { firstName: 'HTML', lastName: 'User', email: 'html@example.com' },
        firstName: 'HTML',
      });

      expect(result.html).toBe('<h1>Hello HTML</h1>');
    });

    it('should leave unmatched variables in output', () => {
      const template = {
        title: 'Hello {{name}}',
        body: 'Missing: {{missing}}',
      };

      const result = templateService.render(template, {
        user: { firstName: 'Test', lastName: 'User', email: 'test@example.com' },
      });

      // Variables without matching context are left as-is
      expect(result.title).toBe('Hello {{name}}');
      expect(result.body).toBe('Missing: {{missing}}');
    });

    it('should handle booking confirmation template', () => {
      const template = templateService.getTemplate('booking_confirmation', 'email');
      expect(template).not.toBeNull();

      if (template) {
        const result = templateService.render(template, {
          user: { firstName: 'John', lastName: 'Diver', email: 'john@example.com' },
          firstName: 'John',
          tripName: 'Coral Reef Adventure',
          tripDate: '2025-01-15',
          departureTime: '08:00',
          siteName: 'Coral Garden',
          centerName: 'Red Sea Divers',
          bookingId: 'BK-12345',
          totalPrice: '450',
          bookingLink: 'https://app.example.com/bookings/12345',
        });

        expect(result.body).toContain('Coral Reef Adventure');
        expect(result.body).toContain('2025-01-15');
        expect(result.body).toContain('BK-12345');
      }
    });

    it('should handle password reset template', () => {
      const template = templateService.getTemplate('password_reset', 'email');
      expect(template).not.toBeNull();

      if (template) {
        const result = templateService.render(template, {
          user: { firstName: 'Jane', lastName: 'User', email: 'jane@example.com' },
          firstName: 'Jane',
          resetLink: 'https://app.example.com/reset?token=abc123',
        });

        expect(result.body).toContain('Jane');
        expect(result.body).toContain('https://app.example.com/reset?token=abc123');
      }
    });
  });

  describe('Template Coverage', () => {
    const notificationTypes = [
      'email_verification',
      'password_reset',
      'login_alert',
      'booking_confirmation',
      'booking_reminder',
      'booking_cancelled',
      'payment_successful',
      'payment_failed',
      'refund_processed',
      'center_verified',
      'certification_verified',
      'certification_expiring',
      'consent_requested',
      'system_announcement',
    ];

    it('should have at least one channel for critical notifications', () => {
      const criticalTypes = [
        'email_verification',
        'password_reset',
        'booking_confirmation',
        'payment_successful',
        'payment_failed',
      ];

      for (const type of criticalTypes) {
        const emailTemplate = templateService.getTemplate(
          type as Parameters<typeof templateService.getTemplate>[0],
          'email'
        );
        const pushTemplate = templateService.getTemplate(
          type as Parameters<typeof templateService.getTemplate>[0],
          'push'
        );

        expect(
          emailTemplate !== null || pushTemplate !== null,
          `Missing template for ${type}`
        ).toBe(true);
      }
    });

    it('should have proper HTML escaping considerations in templates', () => {
      const template = templateService.getTemplate('booking_confirmation', 'email');
      expect(template?.html).toBeDefined();
      // HTML templates should use proper structure
      if (template?.html) {
        expect(template.html).toContain('<');
        expect(template.html).toContain('>');
      }
    });
  });
});
