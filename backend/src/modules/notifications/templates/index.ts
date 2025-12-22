import { NotificationType, NotificationChannel, TemplateContext } from '../notifications.types';

interface TemplateDefinition {
  subject?: string;
  title: string;
  body: string;
  html?: string;
}

type Templates = Record<NotificationType, Partial<Record<NotificationChannel, TemplateDefinition>>>;

const templates: Templates = {
  // ============================================================================
  // AUTHENTICATION
  // ============================================================================
  email_verification: {
    email: {
      subject: 'Verify Your Email - Saudi Diving Platform',
      title: 'Verify Your Email',
      body: 'Hi {{firstName}}, please verify your email by clicking the link: {{verificationLink}}',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0066cc;">Welcome to Saudi Diving Platform!</h2>
          <p>Hi {{firstName}},</p>
          <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
          <p style="text-align: center;">
            <a href="{{verificationLink}}" style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Verify Email
            </a>
          </p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create an account, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">Saudi Diving Platform - Discover the Red Sea</p>
        </div>
      `,
    },
  },

  password_reset: {
    email: {
      subject: 'Reset Your Password - Saudi Diving Platform',
      title: 'Reset Your Password',
      body: 'Hi {{firstName}}, click here to reset your password: {{resetLink}}. Link expires in 1 hour.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0066cc;">Password Reset Request</h2>
          <p>Hi {{firstName}},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <p style="text-align: center;">
            <a href="{{resetLink}}" style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Reset Password
            </a>
          </p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
        </div>
      `,
    },
    sms: {
      title: 'Password Reset',
      body: 'Your Saudi Diving Platform password reset code is: {{resetCode}}. Valid for 1 hour.',
    },
  },

  login_alert: {
    email: {
      subject: 'New Login Detected - Saudi Diving Platform',
      title: 'New Login Detected',
      body: 'Hi {{firstName}}, a new login was detected from {{device}} at {{location}} on {{time}}.',
    },
    push: {
      title: 'New Login Detected',
      body: 'New login from {{device}} at {{location}}',
    },
  },

  // ============================================================================
  // BOOKINGS
  // ============================================================================
  booking_confirmation: {
    email: {
      subject: 'Booking Confirmed - {{tripName}}',
      title: 'Booking Confirmed!',
      body: 'Your booking for {{tripName}} on {{tripDate}} has been confirmed. Booking ID: {{bookingId}}',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0066cc;">Booking Confirmed! 🎉</h2>
          <p>Hi {{firstName}},</p>
          <p>Your diving trip booking has been confirmed. Here are the details:</p>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Trip:</strong> {{tripName}}</p>
            <p><strong>Date:</strong> {{tripDate}}</p>
            <p><strong>Time:</strong> {{departureTime}}</p>
            <p><strong>Dive Site:</strong> {{siteName}}</p>
            <p><strong>Center:</strong> {{centerName}}</p>
            <p><strong>Booking ID:</strong> {{bookingId}}</p>
            <p><strong>Total:</strong> {{totalPrice}} SAR</p>
          </div>
          <p><strong>What to bring:</strong></p>
          <ul>
            <li>Valid certification card</li>
            <li>Photo ID</li>
            <li>Towel and change of clothes</li>
          </ul>
          <p style="text-align: center;">
            <a href="{{bookingLink}}" style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              View Booking Details
            </a>
          </p>
        </div>
      `,
    },
    sms: {
      title: 'Booking Confirmed',
      body: 'Your {{tripName}} booking on {{tripDate}} is confirmed. ID: {{bookingId}}',
    },
    push: {
      title: 'Booking Confirmed! 🎉',
      body: '{{tripName}} on {{tripDate}} is confirmed',
    },
    in_app: {
      title: 'Booking Confirmed',
      body: 'Your booking for {{tripName}} on {{tripDate}} has been confirmed.',
    },
  },

  booking_reminder: {
    email: {
      subject: 'Reminder: Your Diving Trip Tomorrow - {{tripName}}',
      title: 'Trip Reminder',
      body: 'Don\'t forget! Your diving trip {{tripName}} is tomorrow at {{departureTime}}.',
    },
    sms: {
      title: 'Trip Tomorrow',
      body: 'Reminder: {{tripName}} tomorrow at {{departureTime}}. Arrive 30 mins early at {{centerName}}.',
    },
    push: {
      title: 'Trip Tomorrow! 🌊',
      body: '{{tripName}} at {{departureTime}}. Don\'t forget your gear!',
    },
  },

  booking_cancelled: {
    email: {
      subject: 'Booking Cancelled - {{tripName}}',
      title: 'Booking Cancelled',
      body: 'Your booking for {{tripName}} on {{tripDate}} has been cancelled. Reason: {{cancellationReason}}',
    },
    push: {
      title: 'Booking Cancelled',
      body: 'Your booking for {{tripName}} has been cancelled',
    },
  },

  booking_updated: {
    email: {
      subject: 'Booking Updated - {{tripName}}',
      title: 'Booking Updated',
      body: 'Your booking for {{tripName}} has been updated. Please check the new details.',
    },
    push: {
      title: 'Booking Updated',
      body: 'Details for {{tripName}} have been updated',
    },
  },

  waitlist_available: {
    email: {
      subject: 'Spot Available! - {{tripName}}',
      title: 'Waitlist Update',
      body: 'Great news! A spot is now available for {{tripName}} on {{tripDate}}. Book now before it\'s gone!',
    },
    push: {
      title: 'Spot Available! 🎉',
      body: 'A spot opened up for {{tripName}}. Book now!',
    },
  },

  // ============================================================================
  // TRIPS
  // ============================================================================
  trip_reminder: {
    push: {
      title: 'Trip Starting Soon',
      body: '{{tripName}} departs in {{hoursUntil}} hours',
    },
  },

  trip_cancelled: {
    email: {
      subject: 'Trip Cancelled - {{tripName}}',
      title: 'Trip Cancelled',
      body: 'Unfortunately, {{tripName}} on {{tripDate}} has been cancelled. Reason: {{cancellationReason}}. A full refund will be processed.',
    },
    push: {
      title: 'Trip Cancelled',
      body: '{{tripName}} on {{tripDate}} has been cancelled. Refund processing.',
    },
  },

  trip_updated: {
    push: {
      title: 'Trip Updated',
      body: 'Details for {{tripName}} have changed. Please check the app.',
    },
  },

  check_in_reminder: {
    push: {
      title: 'Check-in Open',
      body: 'Check-in for {{tripName}} is now open. Tap to check in.',
    },
  },

  // ============================================================================
  // PAYMENTS
  // ============================================================================
  payment_successful: {
    email: {
      subject: 'Payment Received - {{amount}} SAR',
      title: 'Payment Successful',
      body: 'We received your payment of {{amount}} SAR for booking {{bookingId}}. Thank you!',
    },
    push: {
      title: 'Payment Successful ✓',
      body: '{{amount}} SAR received for your booking',
    },
  },

  payment_failed: {
    email: {
      subject: 'Payment Failed - Action Required',
      title: 'Payment Failed',
      body: 'Your payment of {{amount}} SAR for {{tripName}} could not be processed. Please try again or use a different payment method.',
    },
    push: {
      title: 'Payment Failed',
      body: 'Please retry payment for {{tripName}}',
    },
  },

  refund_processed: {
    email: {
      subject: 'Refund Processed - {{amount}} SAR',
      title: 'Refund Processed',
      body: 'Your refund of {{amount}} SAR has been processed. It may take 5-10 business days to appear in your account.',
    },
    push: {
      title: 'Refund Processed',
      body: '{{amount}} SAR refund is on its way',
    },
  },

  payment_reminder: {
    push: {
      title: 'Payment Reminder',
      body: 'Complete payment for {{tripName}} to confirm your spot',
    },
  },

  // ============================================================================
  // CENTER
  // ============================================================================
  center_verified: {
    email: {
      subject: 'Your Diving Center is Verified! 🎉',
      title: 'Center Verified',
      body: 'Congratulations! {{centerName}} has been verified and is now live on the Saudi Diving Platform.',
    },
  },

  center_rejected: {
    email: {
      subject: 'Center Verification Update',
      title: 'Center Not Verified',
      body: 'Unfortunately, {{centerName}} could not be verified at this time. Reason: {{rejectionReason}}. Please address the issues and resubmit.',
    },
  },

  new_booking: {
    email: {
      subject: 'New Booking - {{tripName}}',
      title: 'New Booking Received',
      body: 'You have a new booking for {{tripName}} on {{tripDate}}. Diver: {{diverName}}',
    },
    push: {
      title: 'New Booking',
      body: '{{diverName}} booked {{tripName}} on {{tripDate}}',
    },
  },

  new_review: {
    push: {
      title: 'New Review',
      body: '{{reviewerName}} left a {{rating}}-star review for {{centerName}}',
    },
  },

  // ============================================================================
  // CERTIFICATIONS
  // ============================================================================
  certification_verified: {
    email: {
      subject: 'Certification Verified',
      title: 'Certification Verified',
      body: 'Your {{certificationName}} certification has been verified. You can now book dives matching your certification level.',
    },
    push: {
      title: 'Certification Verified ✓',
      body: '{{certificationName}} has been verified',
    },
  },

  certification_rejected: {
    email: {
      subject: 'Certification Verification Failed',
      title: 'Certification Not Verified',
      body: 'Your {{certificationName}} certification could not be verified. Reason: {{rejectionReason}}. Please upload a clearer image.',
    },
  },

  certification_expiring: {
    email: {
      subject: 'Certification Expiring Soon',
      title: 'Certification Expiring',
      body: 'Your {{certificationName}} certification expires on {{expiryDate}}. Please renew to continue diving.',
    },
    push: {
      title: 'Certification Expiring',
      body: '{{certificationName}} expires on {{expiryDate}}',
    },
  },

  // ============================================================================
  // GUARDIAN/MINOR
  // ============================================================================
  consent_requested: {
    email: {
      subject: 'Parental Consent Required - {{minorName}}',
      title: 'Consent Requested',
      body: '{{minorName}} has registered on Saudi Diving Platform and needs your consent to participate. Please review and approve.',
    },
  },

  consent_granted: {
    push: {
      title: 'Consent Granted',
      body: 'Your parent/guardian has approved your account',
    },
  },

  minor_activity: {
    push: {
      title: 'Minor Activity',
      body: '{{minorName}} has {{activityType}}',
    },
  },

  // ============================================================================
  // SYSTEM
  // ============================================================================
  system_announcement: {
    email: {
      subject: '{{announcementTitle}}',
      title: '{{announcementTitle}}',
      body: '{{announcementBody}}',
    },
    push: {
      title: '{{announcementTitle}}',
      body: '{{announcementBody}}',
    },
  },

  account_deactivated: {
    email: {
      subject: 'Account Deactivated',
      title: 'Account Deactivated',
      body: 'Your Saudi Diving Platform account has been deactivated. If you believe this is an error, please contact support.',
    },
  },

  promotional: {
    email: {
      subject: '{{promoTitle}}',
      title: '{{promoTitle}}',
      body: '{{promoBody}}',
    },
    push: {
      title: '{{promoTitle}}',
      body: '{{promoBody}}',
    },
  },
};

export class TemplateService {
  getTemplate(
    type: NotificationType,
    channel: NotificationChannel
  ): TemplateDefinition | null {
    return templates[type]?.[channel] || null;
  }

  render(
    template: TemplateDefinition,
    context: TemplateContext
  ): { subject?: string; title: string; body: string; html?: string } {
    return {
      subject: template.subject ? this.interpolate(template.subject, context) : undefined,
      title: this.interpolate(template.title, context),
      body: this.interpolate(template.body, context),
      html: template.html ? this.interpolate(template.html, context) : undefined,
    };
  }

  private interpolate(text: string, context: TemplateContext): string {
    let result = text;

    // Handle nested properties (e.g., user.firstName)
    const flatContext = this.flattenObject(context);

    for (const [key, value] of Object.entries(flatContext)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, String(value ?? ''));
    }

    return result;
  }

  private flattenObject(
    obj: Record<string, unknown>,
    prefix = ''
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(result, this.flattenObject(value as Record<string, unknown>, newKey));
      } else {
        result[newKey] = value;
        // Also add without prefix for simple access
        if (prefix) {
          result[key] = value;
        }
      }
    }

    return result;
  }
}

export const templateService = new TemplateService();
