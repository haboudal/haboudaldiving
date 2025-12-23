# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Saudi Arabia Recreational Diving Platform - a comprehensive platform connecting divers with diving centers, managing SRSA quotas, conservation fees, insurance verification, and emergency response integration.

## Development Commands

```bash
# Start infrastructure
docker-compose up -d

# Backend setup
cd backend
npm install
cp .env.example .env
npm run dev              # Start development server (port 3001)

# Database setup
createdb diving_platform
psql -d diving_platform -f ../database/schema.sql

# Testing
npm run test             # Unit tests
npm run test:coverage    # Coverage report

# Code quality
npm run lint             # Check code style
npm run lint:fix         # Fix code style
npm run typecheck        # TypeScript validation

# Build
npm run build
```

## Architecture

**Stack**: Node.js 18 + Express + TypeScript, PostgreSQL 14+, Redis 7+

**Project Structure**:
```
backend/src/
├── config/          # Configuration (database, redis, env)
├── middleware/      # Auth, error handling, validation, logging
├── modules/         # Feature modules
│   ├── auth/        # JWT authentication (register, login, refresh)
│   ├── users/       # User profile management
│   ├── divers/      # Diver profiles, certifications
│   ├── instructors/ # Instructor profiles, schedules
│   ├── guardians/   # Parent/minor linking, consent
│   ├── centers/     # Diving centers, vessels, staff
│   ├── trips/       # Trip management, bookings, waiting list
│   ├── payments/    # HyperPay integration, checkout, refunds
│   ├── reviews/     # Center and instructor reviews
│   └── dive-logs/   # Dive log tracking and statistics
├── integrations/
│   └── srsa/        # SRSA quota management
├── utils/           # Logger, errors, helpers
└── types/           # TypeScript interfaces
```

## API Endpoints

Base URL: `http://localhost:3001/api/v1`

**Authentication** (`/auth`):
- POST `/register` - Register new user
- POST `/login` - Login, returns JWT tokens
- POST `/logout` - Logout (revoke refresh token)
- POST `/refresh` - Refresh access token
- POST `/verify-email` - Verify email with token
- POST `/forgot-password` - Request password reset
- POST `/reset-password` - Reset password with token

**Users** (`/users`):
- GET `/me` - Get current user
- PATCH `/me` - Update current user

**Divers** (`/divers`):
- GET `/:id/profile` - Get diver profile
- PATCH `/:id/profile` - Update diver profile
- GET `/:id/certifications` - List certifications
- POST `/:id/certifications` - Add certification

**Centers** (`/centers`):
- GET `/` - List centers
- POST `/` - Create center
- GET `/:id` - Get center details
- PATCH `/:id` - Update center
- GET `/:centerId/vessels` - List vessels
- POST `/:centerId/vessels` - Add vessel
- GET `/:centerId/staff` - List staff
- POST `/:centerId/staff` - Add staff member

**SRSA Quota** (`/quota`):
- POST `/check` - Check site quota availability
- POST `/reserve` - Reserve quota (center owners)
- GET `/forecast/:siteCode` - 7-day quota forecast
- GET `/alternatives` - Alternative sites
- POST `/fees/calculate` - Calculate conservation fees

**Trips** (`/trips`):
- GET `/` - List trips (with filters: center, site, status, date range)
- GET `/:id` - Get trip details
- POST `/center/:centerId` - Create trip (draft)
- PATCH `/:id` - Update trip
- DELETE `/:id` - Delete draft trip
- POST `/:id/cancel` - Cancel trip
- POST `/:id/publish` - Publish trip
- GET `/:id/instructors` - List trip instructors
- POST `/:id/instructors` - Add instructor to trip
- DELETE `/:id/instructors/:instructorId` - Remove instructor

**Bookings** (`/trips`):
- GET `/bookings/my` - Get current user's bookings
- GET `/:tripId/bookings` - List trip bookings (center staff)
- POST `/:tripId/bookings` - Create booking
- GET `/bookings/:id` - Get booking details
- PATCH `/bookings/:id` - Update booking
- POST `/bookings/:id/cancel` - Cancel booking
- POST `/bookings/:id/check-in` - Check-in diver (center staff)
- POST `/bookings/:id/waiver` - Sign liability waiver
- GET `/:tripId/eligibility` - Check diver eligibility
- POST `/:tripId/price` - Calculate booking price

**Waiting List** (`/trips`):
- POST `/:tripId/waitlist` - Join waiting list
- DELETE `/:tripId/waitlist` - Leave waiting list
- GET `/:tripId/waitlist` - View waiting list (center staff)

**Payments** (`/payments`):
- POST `/webhook` - HyperPay webhook handler
- POST `/checkout` - Initiate payment checkout
- GET `/my` - User's payment history
- GET `/status/:checkoutId` - Get payment status after form completion
- GET `/booking/:bookingId` - Get payments for a booking
- GET `/:id` - Get payment details
- POST `/:id/refund` - Process refund (admin/center owner)
- GET `/` - List all payments (admin only)

**Reviews** (`/reviews`):
- GET `/centers/:centerId` - Get reviews for a center (with stats)
- GET `/instructors/:instructorId` - Get reviews for an instructor
- GET `/:id` - Get single review
- GET `/my/list` - Get current user's reviews
- GET `/my/pending` - Get bookings available for review
- POST `/` - Create a new review
- PATCH `/:id` - Update own review (within 7 days)
- DELETE `/:id` - Delete own review
- POST `/:id/helpful` - Mark review as helpful
- POST `/:id/report` - Report review for moderation
- POST `/centers/:centerId/reviews/:reviewId/respond` - Center responds to review

**Dive Logs** (`/dive-logs`):
- GET `/` - Get my dive logs (with filters)
- GET `/statistics` - Get my dive statistics
- GET `/:id` - Get single dive log
- GET `/trip/:tripId` - Get dive logs for a trip
- POST `/` - Create a new dive log
- PATCH `/:id` - Update a dive log
- DELETE `/:id` - Delete a dive log
- POST `/import` - Import dives from dive computer
- POST `/:id/verify` - Verify dive log (instructor only)

## Key Implementation Patterns

**Module Pattern**: Each module follows controller -> service -> database pattern:
- `module.routes.ts` - Express routes with middleware
- `module.controller.ts` - Request handling
- `module.service.ts` - Business logic
- `module.validation.ts` - Zod schemas (where applicable)

**Authentication Flow**:
- Access token: 15min, sent in Authorization header
- Refresh token: 7 days, HTTP-only cookie + stored in PostgreSQL
- Token rotation on refresh

**Child Safety**:
- Minors (under 18) require parent email at registration
- Parent must give consent before minor can login
- `requireAdult` middleware blocks certain actions for minors

**SRSA Integration**:
- Mock mode enabled by default (`USE_MOCK_SRSA=true`)
- Quota checks cached in Redis (5min TTL)
- Conservation fees calculated by zone (zone_1: 50 SAR, zone_2: 35 SAR, zone_3: 20 SAR)

## Database

Schema at `database/schema.sql` includes 40+ tables:
- User management: `users`, `diver_profiles`, `instructor_profiles`, `certifications`
- Centers: `diving_centers`, `vessels`, `center_staff`
- Sites: `dive_sites`, `regions`
- Compliance: `srsa_quota_reservations`, `conservation_fee_transactions`
- Safety: `emergency_incidents`, `hyperbaric_chambers`
- Community: `reviews`, `buddy_requests`, `messages`, `dive_logs`

## Environment Variables

See `backend/.env.example` for full list. Critical:
- `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - PostgreSQL
- `REDIS_URL` - Redis connection
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` - Min 32 characters each
- `USE_MOCK_SRSA=true` - Enable SRSA mock mode for development
