import swaggerJsdoc from 'swagger-jsdoc';
import { version } from '../../package.json';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Saudi Arabia Recreational Diving Platform API',
      version,
      description: `
# Overview

The Saudi Arabia Recreational Diving Platform API provides a comprehensive backend for managing diving operations across Saudi Arabia. This includes user management, diving center operations, trip bookings, SRSA quota management, payments, and notifications.

## Key Features

- **Multi-role Authentication**: Divers, Instructors, Center Owners, Admins
- **Minor Safety**: Parent consent workflow for underage divers
- **SRSA Integration**: Real-time quota management and conservation fees
- **HyperPay Payments**: Secure payment processing with refunds
- **Multi-channel Notifications**: Email, SMS, Push, In-app

## Authentication

Most endpoints require JWT authentication. Include the access token in the Authorization header:

\`\`\`
Authorization: Bearer <access_token>
\`\`\`

Access tokens expire after 15 minutes. Use the refresh token endpoint to obtain a new access token.

## Rate Limiting

- Standard endpoints: 100 requests/minute
- Authentication endpoints: 10 requests/minute
- Admin endpoints: 50 requests/minute

## Error Responses

All errors follow a consistent format:

\`\`\`json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
\`\`\`
      `,
      contact: {
        name: 'API Support',
        email: 'api@divingplatform.sa',
      },
      license: {
        name: 'Proprietary',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001/api/v1',
        description: 'Development server',
      },
      {
        url: 'https://api.divingplatform.sa/api/v1',
        description: 'Production server',
      },
    ],
    tags: [
      { name: 'Auth', description: 'Authentication and authorization' },
      { name: 'Users', description: 'User profile management' },
      { name: 'Divers', description: 'Diver profiles and certifications' },
      { name: 'Instructors', description: 'Instructor profiles and schedules' },
      { name: 'Guardians', description: 'Parent/guardian management for minors' },
      { name: 'Centers', description: 'Diving center management' },
      { name: 'Sites', description: 'Dive sites and regions' },
      { name: 'Trips', description: 'Diving trip management' },
      { name: 'Bookings', description: 'Trip booking operations' },
      { name: 'Payments', description: 'Payment processing' },
      { name: 'Notifications', description: 'Notification management' },
      { name: 'SRSA', description: 'SRSA quota and conservation fees' },
      { name: 'Admin', description: 'Administrative operations' },
      { name: 'Analytics', description: 'Platform analytics and reporting' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT access token',
        },
      },
      schemas: {
        // Common schemas
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string', example: 'Invalid input data' },
                details: { type: 'object' },
              },
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            total: { type: 'integer', example: 100 },
            totalPages: { type: 'integer', example: 5 },
          },
        },
        UUID: {
          type: 'string',
          format: 'uuid',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },

        // User schemas
        User: {
          type: 'object',
          properties: {
            id: { $ref: '#/components/schemas/UUID' },
            email: { type: 'string', format: 'email', example: 'diver@example.com' },
            firstName: { type: 'string', example: 'Ahmed' },
            lastName: { type: 'string', example: 'Al-Rashid' },
            role: { type: 'string', enum: ['diver', 'instructor', 'center_owner', 'admin'], example: 'diver' },
            status: { type: 'string', enum: ['active', 'inactive', 'suspended', 'pending_verification'], example: 'active' },
            phone: { type: 'string', example: '+966501234567' },
            dateOfBirth: { type: 'string', format: 'date', example: '1990-01-15' },
            isMinor: { type: 'boolean', example: false },
            emailVerified: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        UserRegistration: {
          type: 'object',
          required: ['email', 'password', 'firstName', 'lastName', 'role', 'dateOfBirth'],
          properties: {
            email: { type: 'string', format: 'email', example: 'newdiver@example.com' },
            password: { type: 'string', minLength: 8, example: 'SecurePass123!' },
            firstName: { type: 'string', example: 'Ahmed' },
            lastName: { type: 'string', example: 'Al-Rashid' },
            role: { type: 'string', enum: ['diver', 'instructor', 'center_owner'], example: 'diver' },
            dateOfBirth: { type: 'string', format: 'date', example: '1990-01-15' },
            phone: { type: 'string', example: '+966501234567' },
            parentEmail: { type: 'string', format: 'email', description: 'Required for minors' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'diver@example.com' },
            password: { type: 'string', example: 'SecurePass123!' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                user: { $ref: '#/components/schemas/User' },
                accessToken: { type: 'string' },
                expiresIn: { type: 'integer', example: 900 },
              },
            },
          },
        },

        // Diver schemas
        DiverProfile: {
          type: 'object',
          properties: {
            id: { $ref: '#/components/schemas/UUID' },
            userId: { $ref: '#/components/schemas/UUID' },
            experienceLevel: { type: 'string', enum: ['beginner', 'intermediate', 'advanced', 'professional'], example: 'intermediate' },
            totalDives: { type: 'integer', example: 50 },
            lastDiveDate: { type: 'string', format: 'date' },
            emergencyContactName: { type: 'string', example: 'Fatima Al-Rashid' },
            emergencyContactPhone: { type: 'string', example: '+966501234568' },
            medicalConditions: { type: 'string' },
            insuranceProvider: { type: 'string' },
            insurancePolicyNumber: { type: 'string' },
            insuranceExpiryDate: { type: 'string', format: 'date' },
          },
        },
        Certification: {
          type: 'object',
          properties: {
            id: { $ref: '#/components/schemas/UUID' },
            diverId: { $ref: '#/components/schemas/UUID' },
            agency: { type: 'string', enum: ['PADI', 'SSI', 'NAUI', 'CMAS', 'BSAC', 'SDI', 'TDI'], example: 'PADI' },
            level: { type: 'string', example: 'Advanced Open Water' },
            certificationNumber: { type: 'string', example: 'PADI-12345678' },
            issueDate: { type: 'string', format: 'date' },
            expiryDate: { type: 'string', format: 'date' },
            verificationStatus: { type: 'string', enum: ['pending', 'verified', 'rejected', 'expired'], example: 'verified' },
          },
        },

        // Center schemas
        DivingCenter: {
          type: 'object',
          properties: {
            id: { $ref: '#/components/schemas/UUID' },
            ownerId: { $ref: '#/components/schemas/UUID' },
            name: { type: 'string', example: 'Red Sea Divers' },
            nameAr: { type: 'string', example: 'غواصي البحر الأحمر' },
            description: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            address: { type: 'string' },
            city: { type: 'string', example: 'Jeddah' },
            region: { type: 'string', example: 'Makkah' },
            latitude: { type: 'number', format: 'double', example: 21.5433 },
            longitude: { type: 'number', format: 'double', example: 39.1728 },
            srsaLicenseNumber: { type: 'string' },
            verificationStatus: { type: 'string', enum: ['pending', 'verified', 'rejected', 'suspended'], example: 'verified' },
            rating: { type: 'number', format: 'float', example: 4.5 },
            totalReviews: { type: 'integer', example: 128 },
          },
        },
        Vessel: {
          type: 'object',
          properties: {
            id: { $ref: '#/components/schemas/UUID' },
            centerId: { $ref: '#/components/schemas/UUID' },
            name: { type: 'string', example: 'Sea Explorer' },
            registrationNumber: { type: 'string' },
            capacity: { type: 'integer', example: 20 },
            vesselType: { type: 'string', example: 'speedboat' },
            hasOxygen: { type: 'boolean', example: true },
            hasFirstAid: { type: 'boolean', example: true },
            hasRadio: { type: 'boolean', example: true },
            lastInspectionDate: { type: 'string', format: 'date' },
          },
        },

        // Site schemas
        DiveSite: {
          type: 'object',
          properties: {
            id: { $ref: '#/components/schemas/UUID' },
            name: { type: 'string', example: 'Coral Garden' },
            nameAr: { type: 'string' },
            siteCode: { type: 'string', example: 'RS-JED-001' },
            regionId: { $ref: '#/components/schemas/UUID' },
            description: { type: 'string' },
            latitude: { type: 'number', format: 'double' },
            longitude: { type: 'number', format: 'double' },
            maxDepth: { type: 'number', example: 30 },
            minCertificationLevel: { type: 'string', example: 'Open Water' },
            conservationZone: { type: 'string', enum: ['zone_1', 'zone_2', 'zone_3'], example: 'zone_1' },
            dailyDiverLimit: { type: 'integer', example: 50 },
            difficulty: { type: 'string', enum: ['easy', 'moderate', 'difficult', 'expert'], example: 'moderate' },
          },
        },

        // Trip schemas
        Trip: {
          type: 'object',
          properties: {
            id: { $ref: '#/components/schemas/UUID' },
            centerId: { $ref: '#/components/schemas/UUID' },
            siteId: { $ref: '#/components/schemas/UUID' },
            name: { type: 'string', example: 'Morning Reef Dive' },
            description: { type: 'string' },
            date: { type: 'string', format: 'date', example: '2025-01-15' },
            departureTime: { type: 'string', example: '08:00' },
            returnTime: { type: 'string', example: '14:00' },
            maxParticipants: { type: 'integer', example: 12 },
            currentParticipants: { type: 'integer', example: 8 },
            pricePerDiver: { type: 'number', format: 'float', example: 350 },
            equipmentRentalPrice: { type: 'number', format: 'float', example: 100 },
            status: { type: 'string', enum: ['draft', 'published', 'full', 'cancelled', 'completed'], example: 'published' },
            minimumCertification: { type: 'string', example: 'Open Water' },
            includesEquipment: { type: 'boolean', example: false },
            includesMeals: { type: 'boolean', example: true },
          },
        },
        TripCreate: {
          type: 'object',
          required: ['siteId', 'date', 'departureTime', 'returnTime', 'maxParticipants', 'pricePerDiver'],
          properties: {
            siteId: { $ref: '#/components/schemas/UUID' },
            name: { type: 'string' },
            description: { type: 'string' },
            date: { type: 'string', format: 'date' },
            departureTime: { type: 'string', example: '08:00' },
            returnTime: { type: 'string', example: '14:00' },
            maxParticipants: { type: 'integer', minimum: 1 },
            pricePerDiver: { type: 'number', minimum: 0 },
            equipmentRentalPrice: { type: 'number' },
            minimumCertification: { type: 'string' },
            includesEquipment: { type: 'boolean' },
            includesMeals: { type: 'boolean' },
          },
        },

        // Booking schemas
        Booking: {
          type: 'object',
          properties: {
            id: { $ref: '#/components/schemas/UUID' },
            tripId: { $ref: '#/components/schemas/UUID' },
            userId: { $ref: '#/components/schemas/UUID' },
            status: { type: 'string', enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'], example: 'confirmed' },
            participantCount: { type: 'integer', example: 2 },
            totalAmount: { type: 'number', format: 'float', example: 800 },
            conservationFee: { type: 'number', format: 'float', example: 100 },
            equipmentRental: { type: 'boolean', example: true },
            specialRequests: { type: 'string' },
            bookingReference: { type: 'string', example: 'BK-2025-ABC123' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        BookingCreate: {
          type: 'object',
          required: ['participantCount'],
          properties: {
            participantCount: { type: 'integer', minimum: 1, example: 2 },
            equipmentRental: { type: 'boolean', example: true },
            specialRequests: { type: 'string' },
          },
        },

        // Payment schemas
        Payment: {
          type: 'object',
          properties: {
            id: { $ref: '#/components/schemas/UUID' },
            bookingId: { $ref: '#/components/schemas/UUID' },
            amount: { type: 'number', format: 'float', example: 800 },
            currency: { type: 'string', example: 'SAR' },
            status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded'], example: 'completed' },
            paymentMethod: { type: 'string', enum: ['card', 'mada', 'applepay', 'stcpay'], example: 'mada' },
            transactionId: { type: 'string' },
            gatewayReference: { type: 'string' },
            paidAt: { type: 'string', format: 'date-time' },
          },
        },
        PaymentInitiate: {
          type: 'object',
          required: ['bookingId', 'paymentMethod'],
          properties: {
            bookingId: { $ref: '#/components/schemas/UUID' },
            paymentMethod: { type: 'string', enum: ['card', 'mada', 'applepay', 'stcpay'], example: 'mada' },
            returnUrl: { type: 'string', format: 'uri' },
          },
        },

        // Notification schemas
        Notification: {
          type: 'object',
          properties: {
            id: { $ref: '#/components/schemas/UUID' },
            userId: { $ref: '#/components/schemas/UUID' },
            type: { type: 'string', example: 'booking_confirmation' },
            title: { type: 'string', example: 'Booking Confirmed' },
            body: { type: 'string' },
            channel: { type: 'string', enum: ['email', 'sms', 'push', 'in_app'], example: 'push' },
            status: { type: 'string', enum: ['pending', 'sent', 'delivered', 'failed'], example: 'delivered' },
            readAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        NotificationPreferences: {
          type: 'object',
          properties: {
            email: { type: 'boolean', example: true },
            sms: { type: 'boolean', example: false },
            push: { type: 'boolean', example: true },
            inApp: { type: 'boolean', example: true },
            quietHoursStart: { type: 'string', example: '22:00' },
            quietHoursEnd: { type: 'string', example: '08:00' },
            timezone: { type: 'string', example: 'Asia/Riyadh' },
          },
        },

        // SRSA schemas
        QuotaCheck: {
          type: 'object',
          properties: {
            siteCode: { type: 'string', example: 'RS-JED-001' },
            date: { type: 'string', format: 'date' },
            available: { type: 'boolean', example: true },
            remainingSlots: { type: 'integer', example: 25 },
            dailyLimit: { type: 'integer', example: 50 },
            currentReservations: { type: 'integer', example: 25 },
          },
        },
        ConservationFee: {
          type: 'object',
          properties: {
            zone: { type: 'string', enum: ['zone_1', 'zone_2', 'zone_3'], example: 'zone_1' },
            feePerDiver: { type: 'number', example: 50 },
            totalFee: { type: 'number', example: 100 },
            diverCount: { type: 'integer', example: 2 },
          },
        },

        // Analytics schemas
        PlatformOverview: {
          type: 'object',
          properties: {
            users: {
              type: 'object',
              properties: {
                total: { type: 'integer', example: 5000 },
                new: { type: 'integer', example: 150 },
                active: { type: 'integer', example: 1200 },
              },
            },
            bookings: {
              type: 'object',
              properties: {
                total: { type: 'integer', example: 8500 },
                completed: { type: 'integer', example: 7800 },
                revenue: { type: 'number', example: 2500000 },
              },
            },
            trips: {
              type: 'object',
              properties: {
                total: { type: 'integer', example: 450 },
                active: { type: 'integer', example: 85 },
                fillRate: { type: 'number', example: 0.78 },
              },
            },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                error: {
                  code: 'UNAUTHORIZED',
                  message: 'No token provided',
                },
              },
            },
          },
        },
        Forbidden: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                error: {
                  code: 'FORBIDDEN',
                  message: 'Insufficient permissions',
                },
              },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                error: {
                  code: 'NOT_FOUND',
                  message: 'Resource not found',
                },
              },
            },
          },
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                error: {
                  code: 'VALIDATION_ERROR',
                  message: 'Invalid input data',
                  details: {
                    email: 'Invalid email format',
                  },
                },
              },
            },
          },
        },
      },
      parameters: {
        PageParam: {
          name: 'page',
          in: 'query',
          schema: { type: 'integer', minimum: 1, default: 1 },
          description: 'Page number',
        },
        LimitParam: {
          name: 'limit',
          in: 'query',
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          description: 'Items per page',
        },
        IdParam: {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: 'Resource UUID',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/docs/paths/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
