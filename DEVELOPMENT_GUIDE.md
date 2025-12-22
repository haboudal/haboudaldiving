# Diving Platform - Complete Development Guide

## Table of Contents
1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Development Setup](#development-setup)
4. [Module Implementation Priority](#module-implementation-priority)
5. [API Endpoints Reference](#api-endpoints-reference)
6. [Database Implementation](#database-implementation)
7. [Integration Guidelines](#integration-guidelines)
8. [Testing Strategy](#testing-strategy)
9. [Deployment Process](#deployment-process)
10. [Maintenance and Monitoring](#maintenance-and-monitoring)

---

## 1. Project Overview

### Vision
Create a comprehensive diving platform for Saudi Arabia that:
- Connects divers with diving centers
- Manages SRSA quotas and conservation fees
- Ensures safety through insurance verification
- Provides offline capabilities
- Integrates with national hyperbaric chamber registry

### Key Stakeholders
- **Divers**: Book trips, find buddies, log dives
- **Diving Centers**: Manage trips, vessels, staff
- **Instructors**: Independent profiles, direct bookings
- **Parents/Guardians**: Manage minor accounts
- **Regulatory Bodies**: SRSA, Ministry of Tourism

---

## 2. System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Client Layer                         │
├──────────────┬──────────────┬──────────────┬────────────┤
│   Web App    │  iOS App     │ Android App  │ Watch App  │
│   (React)    │ (React       │ (React       │ (Native)   │
│              │  Native)     │  Native)     │            │
└──────────────┴──────────────┴──────────────┴────────────┘
                         │
                         │ HTTPS/WSS
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   API Gateway / Load Balancer            │
│                   (NGINX / AWS ALB)                      │
└─────────────────────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Auth      │  │   Booking   │  │   Payment   │
│   Service   │  │   Service   │  │   Service   │
└─────────────┘  └─────────────┘  └─────────────┘
         │               │               │
         ▼               ▼               ▼
┌─────────────────────────────────────────────────────────┐
│              Core Services (Node.js/Express)             │
├─────────────┬────────────┬────────────┬─────────────────┤
│   Users     │   Trips    │   Quota    │   Emergency     │
│   Centers   │   Reviews  │   SRSA     │   Hyperbaric    │
│   Vessels   │   Messages │   Fees     │   Incidents     │
└─────────────┴────────────┴────────────┴─────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ PostgreSQL  │  │   Redis     │  │Elasticsearch│
│  (Primary)  │  │  (Cache)    │  │  (Search)   │
└─────────────┘  └─────────────┘  └─────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              External Integrations                       │
├────────────┬─────────────┬────────────┬─────────────────┤
│  SRSA API  │  Insurance  │  Payment   │  Hyperbaric     │
│  (Quota)   │  Providers  │  Gateways  │  Registry       │
└────────────┴─────────────┴────────────┴─────────────────┘
```

### Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend Web | React 18 + TypeScript | Main web application |
| Frontend Mobile | React Native | iOS/Android apps |
| Backend API | Node.js + Express | RESTful API server |
| Database | PostgreSQL 14+ | Primary data store |
| Cache | Redis | Session, quota cache |
| Search | Elasticsearch 8+ | Trip/site search |
| Queue | RabbitMQ | Background jobs |
| Storage | AWS S3 | Media files |
| CDN | CloudFlare | Static assets |
| Monitoring | Prometheus + Grafana | Metrics & alerts |

---

## 3. Development Setup

### Prerequisites Checklist

```bash
# Required software
□ Node.js 18+
□ PostgreSQL 14+
□ Redis 7+
□ Docker & Docker Compose
□ Git

# Optional but recommended
□ VS Code with extensions:
  - ESLint
  - Prettier
  - PostgreSQL Explorer
  - REST Client
```

### Quick Start (5 minutes)

```bash
# 1. Clone repository
git clone https://github.com/your-org/diving-platform.git
cd diving-platform

# 2. Start infrastructure with Docker
docker-compose up -d

# 3. Setup backend
cd backend
npm install
cp .env.example .env
# Edit .env with your keys
npm run migrate
npm run seed
npm run dev

# 4. Setup frontend (in new terminal)
cd frontend
npm install
cp .env.example .env
npm run dev

# 5. Access application
# Web: http://localhost:3000
# API: http://localhost:3001
# API Docs: http://localhost:3001/api/docs
```

### Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: diving_platform
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  elasticsearch:
    image: elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - es_data:/usr/share/elasticsearch/data

volumes:
  postgres_data:
  redis_data:
  es_data:
```

---

## 4. Module Implementation Priority

### Phase 1: Foundation (Weeks 1-4)

#### Week 1: Core Infrastructure
- [x] Database schema implementation
- [x] Backend project structure
- [x] Authentication system (JWT)
- [ ] Basic user CRUD
- [ ] Logging infrastructure
- [ ] Error handling middleware

#### Week 2: User Management
- [ ] Diver profile management
- [ ] Certification verification
- [ ] Medical data (minimal storage)
- [ ] Parent/guardian linking
- [ ] Profile privacy controls

#### Week 3: Center Management
- [ ] Center registration
- [ ] Vessel management
- [ ] Staff assignment
- [ ] SRSA permit integration

#### Week 4: Regulatory Foundation
- [ ] SRSA quota checking (read-only)
- [ ] Conservation fee calculation
- [ ] Basic compliance logging
- [ ] Inspector portal (read-only)

### Phase 2: Booking Engine (Weeks 5-8)

#### Week 5: Trip Creation
- [ ] Trip CRUD operations
- [ ] Dive site integration
- [ ] Quota validation
- [ ] Weather checks

#### Week 6: Booking Flow
- [ ] Booking creation
- [ ] Requirement validation
- [ ] Waiting list management
- [ ] Digital waivers

#### Week 7: Payments
- [ ] SADAD integration
- [ ] Mada payment integration
- [ ] Payment webhooks
- [ ] Refund processing

#### Week 8: Settlement
- [ ] Payout calculations
- [ ] Conservation fee segregation
- [ ] Settlement reports
- [ ] Reconciliation

### Phase 3: Safety & Community (Weeks 9-12)

#### Week 9: Emergency System
- [ ] Incident reporting
- [ ] Hyperbaric registry integration
- [ ] Emergency broadcast
- [ ] SOS features

#### Week 10: Buddy Matching
- [ ] Compatibility algorithm
- [ ] Safety constraints
- [ ] Match requests
- [ ] Center overrides

#### Week 11: Reviews & Ratings
- [ ] Review submission
- [ ] Verification checks
- [ ] Moderation queue
- [ ] Rating aggregation

#### Week 12: Messaging
- [ ] Real-time chat
- [ ] End-to-end encryption
- [ ] Child safety controls
- [ ] Offline queueing

### Phase 4: Intelligence & Mobile (Weeks 13-16)

#### Week 13: Mobile Apps
- [ ] React Native setup
- [ ] Offline sync
- [ ] Conflict resolution
- [ ] Push notifications

#### Week 14: AI Features
- [ ] Recommendation engine
- [ ] Bias mitigation
- [ ] Fairness audits
- [ ] Transparency reports

#### Week 15: Analytics
- [ ] User dashboards
- [ ] Center analytics
- [ ] SDG reporting
- [ ] Compliance metrics

#### Week 16: Testing & Polish
- [ ] E2E testing
- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentation

---

## 5. API Endpoints Reference

### Authentication

```
POST   /api/v1/auth/register          - Register new user
POST   /api/v1/auth/login             - Login
POST   /api/v1/auth/logout            - Logout
POST   /api/v1/auth/refresh           - Refresh token
POST   /api/v1/auth/forgot-password   - Request password reset
POST   /api/v1/auth/reset-password    - Reset password
POST   /api/v1/auth/verify-email      - Verify email
POST   /api/v1/auth/resend-verification - Resend verification
```

### Users

```
GET    /api/v1/users/me               - Get current user
PATCH  /api/v1/users/me               - Update current user
GET    /api/v1/users/:id              - Get user by ID
DELETE /api/v1/users/:id              - Delete user

# Diver-specific
GET    /api/v1/users/:id/profile      - Get diver profile
PATCH  /api/v1/users/:id/profile      - Update diver profile
GET    /api/v1/users/:id/certifications - Get certifications
POST   /api/v1/users/:id/certifications - Add certification
GET    /api/v1/users/:id/dive-logs    - Get dive logs
POST   /api/v1/users/:id/dive-logs    - Create dive log

# Instructor-specific
GET    /api/v1/users/:id/instructor   - Get instructor profile
PATCH  /api/v1/users/:id/instructor   - Update instructor profile
GET    /api/v1/users/:id/schedule     - Get instructor schedule
```

### Diving Centers

```
GET    /api/v1/centers                - List centers
POST   /api/v1/centers                - Create center
GET    /api/v1/centers/:id            - Get center details
PATCH  /api/v1/centers/:id            - Update center
DELETE /api/v1/centers/:id            - Delete center

# Vessels
GET    /api/v1/centers/:id/vessels    - List vessels
POST   /api/v1/centers/:id/vessels    - Add vessel
PATCH  /api/v1/centers/:id/vessels/:vesselId - Update vessel

# Staff
GET    /api/v1/centers/:id/staff      - List staff
POST   /api/v1/centers/:id/staff      - Add staff member
DELETE /api/v1/centers/:id/staff/:staffId - Remove staff

# Analytics
GET    /api/v1/centers/:id/analytics  - Get center analytics
GET    /api/v1/centers/:id/bookings   - Get center bookings
GET    /api/v1/centers/:id/revenue    - Get revenue report
```

### Trips

```
GET    /api/v1/trips                  - Search trips
POST   /api/v1/trips                  - Create trip
GET    /api/v1/trips/:id              - Get trip details
PATCH  /api/v1/trips/:id              - Update trip
DELETE /api/v1/trips/:id              - Cancel trip

# Availability
GET    /api/v1/trips/:id/availability - Check availability
GET    /api/v1/trips/:id/waiting-list - Get waiting list

# Manifest
GET    /api/v1/trips/:id/manifest     - Get trip manifest
POST   /api/v1/trips/:id/check-in     - Check in diver
```

### Bookings

```
GET    /api/v1/bookings               - List user bookings
POST   /api/v1/bookings               - Create booking
GET    /api/v1/bookings/:id           - Get booking details
PATCH  /api/v1/bookings/:id           - Update booking
POST   /api/v1/bookings/:id/cancel    - Cancel booking

# Payment
POST   /api/v1/bookings/:id/payment   - Process payment
GET    /api/v1/bookings/:id/invoice   - Get invoice

# Waivers
POST   /api/v1/bookings/:id/waiver    - Sign waiver
GET    /api/v1/bookings/:id/waiver    - Get waiver status

# QR Code
GET    /api/v1/bookings/:id/qr        - Get check-in QR code
```

### Quota Management

```
POST   /api/v1/quota/check            - Check quota availability
POST   /api/v1/quota/reserve          - Reserve quota
DELETE /api/v1/quota/reserve/:id      - Cancel reservation
GET    /api/v1/quota/forecast/:siteCode - Get 7-day forecast
GET    /api/v1/quota/alternatives     - Get alternative sites

# Conservation Fees
POST   /api/v1/quota/fees/calculate   - Calculate fees
POST   /api/v1/quota/fees/submit      - Submit fee payment
GET    /api/v1/quota/fees/reconcile   - Daily reconciliation
```

### Emergency

```
POST   /api/v1/emergency/incident     - Report incident
GET    /api/v1/emergency/incident/:id - Get incident details
PATCH  /api/v1/emergency/incident/:id - Update incident

# Hyperbaric Chambers
GET    /api/v1/emergency/chambers     - List all chambers
GET    /api/v1/emergency/chambers/nearest - Find nearest chamber
GET    /api/v1/emergency/chambers/:id/availability - Check availability
POST   /api/v1/emergency/chambers/:id/refer - Refer patient
```

### Reviews

```
GET    /api/v1/reviews                - List reviews
POST   /api/v1/reviews                - Create review
GET    /api/v1/reviews/:id            - Get review
PATCH  /api/v1/reviews/:id            - Update review
DELETE /api/v1/reviews/:id            - Delete review

# Moderation
POST   /api/v1/reviews/:id/flag       - Flag review
POST   /api/v1/reviews/:id/respond    - Center response
```

### Messages

```
GET    /api/v1/messages               - Get conversations
GET    /api/v1/messages/:conversationId - Get conversation messages
POST   /api/v1/messages               - Send message
PATCH  /api/v1/messages/:id/read      - Mark as read
DELETE /api/v1/messages/:id           - Delete message
```

---

## 6. Database Implementation

### Migration Strategy

```bash
# Create new migration
npm run migrate:make migration_name

# Run migrations
npm run migrate

# Rollback last migration
npm run migrate:rollback

# Reset database (dev only)
npm run db:reset
```

### Key Tables Priority

**Phase 1:**
1. users
2. diver_profiles
3. certifications
4. diving_centers
5. vessels

**Phase 2:**
6. dive_sites
7. trips
8. bookings
9. payments
10. settlements

**Phase 3:**
11. srsa_quota_reservations
12. conservation_fee_transactions
13. emergency_incidents
14. hyperbaric_chambers
15. reviews

**Phase 4:**
16. buddy_requests
17. messages
18. dive_logs
19. notifications

### Backup Strategy

```bash
# Daily automated backups
0 2 * * * pg_dump diving_platform | gzip > backup_$(date +\%Y\%m\%d).sql.gz

# Backup retention
- Daily backups: 7 days
- Weekly backups: 4 weeks
- Monthly backups: 12 months
- Yearly backups: 7 years
```

---

## 7. Integration Guidelines

### SRSA API Integration

```typescript
// Example: Check quota before creating trip
import { srsaQuotaService } from '@/integrations/srsa';

async function createTrip(tripData) {
  // 1. Check quota availability
  const quotaCheck = await srsaQuotaService.checkQuota({
    siteCode: tripData.siteCode,
    date: tripData.date,
    numberOfDivers: tripData.maxParticipants
  });
  
  if (!quotaCheck.available) {
    // Suggest alternative sites
    const alternatives = await srsaQuotaService.getAlternativeSites(
      tripData.siteCode,
      tripData.date,
      tripData.maxParticipants
    );
    throw new QuotaUnavailableError(alternatives);
  }
  
  // 2. Create trip
  const trip = await Trip.create(tripData);
  
  // 3. Reserve quota
  const permit = await srsaQuotaService.requestPermit({
    tripId: trip.id,
    siteCode: tripData.siteCode,
    date: tripData.date,
    numberOfDivers: tripData.maxParticipants,
    centerPermitNumber: tripData.centerPermit,
    vesselRegistration: tripData.vesselRegistration
  });
  
  // 4. Update trip with permit
  await trip.update({
    srsaPermitNumber: permit.permitNumber,
    quotaReserved: true
  });
  
  return trip;
}
```

### Payment Integration

```typescript
// Example: Process booking payment
async function processPayment(bookingId, paymentMethod) {
  const booking = await Booking.findById(bookingId);
  
  // Calculate amounts
  const amounts = {
    base: booking.baseAmount,
    equipment: booking.equipmentRentalAmount,
    insurance: booking.insuranceAmount,
    conservationFee: booking.conservationFeeAmount,
    platformFee: booking.platformFee,
    vat: (booking.baseAmount + booking.platformFee) * 0.15,
    total: booking.totalAmount
  };
  
  // Process payment through gateway
  let paymentResult;
  switch (paymentMethod) {
    case 'mada':
    case 'visa':
    case 'mastercard':
      paymentResult = await sadadService.charge(amounts.total, paymentMethod);
      break;
    case 'apple_pay':
      paymentResult = await applePayService.charge(amounts.total);
      break;
    default:
      throw new Error('Unsupported payment method');
  }
  
  // Record payment
  await Payment.create({
    bookingId,
    amount: amounts.total,
    paymentMethod,
    transactionId: paymentResult.transactionId,
    status: 'completed'
  });
  
  // Submit conservation fee to SRSA
  if (amounts.conservationFee > 0) {
    await srsaQuotaService.submitConservationFeePayment(
      bookingId,
      booking.siteCode,
      amounts.conservationFee,
      paymentResult.transactionId
    );
  }
  
  // Update booking status
  await booking.update({ status: 'paid', paymentStatus: 'completed' });
  
  // Send confirmation
  await sendBookingConfirmation(booking);
  
  return booking;
}
```

---

## 8. Testing Strategy

### Test Pyramid

```
        /\
       /  \
      /E2E \       5% - End-to-end tests
     /──────\
    /        \
   /Integration\ 15% - Integration tests
  /────────────\
 /              \
/   Unit Tests   \ 80% - Unit tests
──────────────────
```

### Testing Commands

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage

# Watch mode
npm run test:watch
```

### Example Unit Test

```typescript
// Example: SRSA quota service test
import { srsaQuotaService } from '@/integrations/srsa';
import { expect, describe, it, vi } from 'vitest';

describe('SRSA Quota Service', () => {
  it('should check quota availability', async () => {
    const result = await srsaQuotaService.checkQuota({
      siteCode: 'FARASAN_01',
      date: '2025-12-01',
      numberOfDivers: 12
    });
    
    expect(result).toHaveProperty('available');
    expect(result).toHaveProperty('remainingSpots');
    expect(result.remainingSpots).toBeGreaterThanOrEqual(0);
  });
  
  it('should calculate conservation fees correctly', () => {
    const fee = srsaQuotaService.calculateConservationFee(
      'FARASAN_01',
      'zone_2',
      10,
      '2025-12-01'
    );
    
    expect(fee.totalFee).toBe(350); // 10 divers × SAR 35
  });
});
```

---

## 9. Deployment Process

### Environment Preparation

```bash
# Production checklist
□ Database backup verified
□ Environment variables set
□ SSL certificates valid
□ DNS configured
□ CDN configured
□ Monitoring alerts configured
□ Load balancer configured
□ Auto-scaling configured
```

### Deployment Steps

```bash
# 1. Build application
npm run build

# 2. Run database migrations
npm run migrate

# 3. Deploy backend
pm2 start ecosystem.config.js --env production

# 4. Deploy frontend
aws s3 sync ./frontend/dist s3://diving-platform-frontend/
aws cloudfront create-invalidation --distribution-id XXX --paths "/*"

# 5. Health check
curl https://api.divingplatform.sa/health

# 6. Smoke tests
npm run test:smoke
```

### Rollback Procedure

```bash
# If deployment fails:
# 1. Revert code
git revert HEAD
git push

# 2. Rollback database (if needed)
npm run migrate:rollback

# 3. Redeploy previous version
pm2 reload all

# 4. Notify stakeholders
```

---

## 10. Maintenance and Monitoring

### Daily Checks

- [ ] System health dashboard
- [ ] Error rate < 0.1%
- [ ] API response time < 200ms
- [ ] Database connections healthy
- [ ] SRSA API connectivity
- [ ] Payment gateway status

### Weekly Tasks

- [ ] Review error logs
- [ ] Check disk space
- [ ] Analyze slow queries
- [ ] Review security alerts
- [ ] Update dependencies
- [ ] Backup verification

### Monthly Tasks

- [ ] Security audit
- [ ] Performance optimization
- [ ] Cost analysis
- [ ] Capacity planning
- [ ] Documentation update
- [ ] Compliance review

---

## Support Contacts

- **Technical Lead**: tech@divingplatform.sa
- **DevOps**: devops@divingplatform.sa
- **Security**: security@divingplatform.sa
- **Emergency**: +966-XXX-XXXX (24/7)

---

*Last Updated: November 2025*
*Version: 2.2*
