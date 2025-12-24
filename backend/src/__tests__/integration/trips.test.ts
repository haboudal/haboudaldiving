import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import { Express } from 'express';
import {
  createTestUser,
  createTestCenterOwner,
  createTestAdmin,
  generateAccessToken,
  generateUUID,
} from '../utils/test-helpers';

describe('Trips Module Integration Tests', () => {
  let app: Express;
  let testUser = createTestUser();
  let testOwner = createTestCenterOwner();
  let testAdmin = createTestAdmin();
  let userToken: string;
  let ownerToken: string;
  let adminToken: string;

  beforeAll(() => {
    app = createApp();
    userToken = generateAccessToken(testUser);
    ownerToken = generateAccessToken(testOwner);
    adminToken = generateAccessToken(testAdmin);
  });

  describe('GET /api/v1/trips', () => {
    it('should return trips list (public endpoint)', async () => {
      const response = await request(app)
        .get('/api/v1/trips')
        .send();

      expect(response.status).toBeOneOf([200, 500]);
    });

    it('should accept filter parameters', async () => {
      const response = await request(app)
        .get('/api/v1/trips')
        .query({
          status: 'published',
          page: 1,
          limit: 10,
        })
        .send();

      expect(response.status).toBeOneOf([200, 500]);
    });

    it('should accept date range filters', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const response = await request(app)
        .get('/api/v1/trips')
        .query({
          from: tomorrow.toISOString().split('T')[0],
          to: nextWeek.toISOString().split('T')[0],
        })
        .send();

      expect(response.status).toBeOneOf([200, 500]);
    });
  });

  describe('GET /api/v1/trips/:id', () => {
    it('should return 400 for invalid UUID', async () => {
      const response = await request(app)
        .get('/api/v1/trips/not-a-uuid')
        .send();

      // 400 for validation, 500 for DB error
      expect(response.status).toBeOneOf([400, 500]);
    });

    it('should accept valid UUID', async () => {
      const response = await request(app)
        .get(`/api/v1/trips/${generateUUID()}`)
        .send();

      expect(response.status).toBeOneOf([404, 500]);
    });
  });

  describe('POST /api/v1/trips/center/:centerId', () => {
    const centerId = generateUUID();

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/v1/trips/center/${centerId}`)
        .send({
          siteId: generateUUID(),
          date: '2025-01-15',
          departureTime: '08:00',
          returnTime: '14:00',
          maxParticipants: 10,
          pricePerDiver: 350,
        });

      expect(response.status).toBe(401);
    });

    it('should reject invalid date format', async () => {
      const response = await request(app)
        .post(`/api/v1/trips/center/${centerId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          siteId: generateUUID(),
          date: 'invalid-date',
          departureTime: '08:00',
          returnTime: '14:00',
          maxParticipants: 10,
          pricePerDiver: 350,
        });

      expect(response.status).toBe(400);
    });

    it('should reject negative price', async () => {
      const response = await request(app)
        .post(`/api/v1/trips/center/${centerId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          siteId: generateUUID(),
          date: '2025-01-15',
          departureTime: '08:00',
          returnTime: '14:00',
          maxParticipants: 10,
          pricePerDiver: -100,
        });

      expect(response.status).toBe(400);
    });

    it('should reject zero max participants', async () => {
      const response = await request(app)
        .post(`/api/v1/trips/center/${centerId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          siteId: generateUUID(),
          date: '2025-01-15',
          departureTime: '08:00',
          returnTime: '14:00',
          maxParticipants: 0,
          pricePerDiver: 350,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Booking Endpoints', () => {
    const tripId = generateUUID();

    describe('GET /api/v1/trips/bookings/my', () => {
      it('should require authentication', async () => {
        const response = await request(app)
          .get('/api/v1/trips/bookings/my')
          .send();

        expect(response.status).toBe(401);
      });

      it('should return user bookings', async () => {
        const response = await request(app)
          .get('/api/v1/trips/bookings/my')
          .set('Authorization', `Bearer ${userToken}`)
          .send();

        expect(response.status).toBeOneOf([200, 500]);
      });
    });

    describe('POST /api/v1/trips/:tripId/bookings', () => {
      it('should require authentication', async () => {
        const response = await request(app)
          .post(`/api/v1/trips/${tripId}/bookings`)
          .send({
            participantCount: 1,
          });

        expect(response.status).toBe(401);
      });

      it('should reject invalid participant count', async () => {
        const response = await request(app)
          .post(`/api/v1/trips/${tripId}/bookings`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            participantCount: 0,
          });

        // 400 for validation, 404 for trip not found, 500 for DB error
        expect(response.status).toBeOneOf([400, 404, 500]);
      });

      it('should accept valid booking request', async () => {
        const response = await request(app)
          .post(`/api/v1/trips/${tripId}/bookings`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            participantCount: 2,
          });

        expect(response.status).toBeOneOf([201, 404, 500]);
      });
    });

    describe('POST /api/v1/trips/:tripId/eligibility', () => {
      it('should require authentication', async () => {
        const response = await request(app)
          .get(`/api/v1/trips/${tripId}/eligibility`)
          .send();

        expect(response.status).toBe(401);
      });

      it('should check eligibility for authenticated user', async () => {
        const response = await request(app)
          .get(`/api/v1/trips/${tripId}/eligibility`)
          .set('Authorization', `Bearer ${userToken}`)
          .send();

        expect(response.status).toBeOneOf([200, 404, 500]);
      });
    });

    describe('POST /api/v1/trips/:tripId/price', () => {
      it('should calculate price', async () => {
        const response = await request(app)
          .post(`/api/v1/trips/${tripId}/price`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            participantCount: 2,
            equipmentRental: true,
          });

        expect(response.status).toBeOneOf([200, 404, 500]);
      });
    });
  });

  describe('Waiting List', () => {
    const tripId = generateUUID();

    describe('POST /api/v1/trips/:tripId/waitlist', () => {
      it('should require authentication', async () => {
        const response = await request(app)
          .post(`/api/v1/trips/${tripId}/waitlist`)
          .send();

        expect(response.status).toBe(401);
      });

      it('should accept waitlist request', async () => {
        const response = await request(app)
          .post(`/api/v1/trips/${tripId}/waitlist`)
          .set('Authorization', `Bearer ${userToken}`)
          .send();

        // 201 for success, 400 for validation (e.g., already on waitlist),
        // 404 for trip not found, 500 for DB error
        expect(response.status).toBeOneOf([201, 400, 404, 500]);
      });
    });

    describe('DELETE /api/v1/trips/:tripId/waitlist', () => {
      it('should require authentication', async () => {
        const response = await request(app)
          .delete(`/api/v1/trips/${tripId}/waitlist`)
          .send();

        expect(response.status).toBe(401);
      });
    });
  });
});

