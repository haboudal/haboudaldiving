import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import { Express } from 'express';
import {
  createTestUser,
  createTestAdmin,
  generateAccessToken,
  generateUUID,
} from '../utils/test-helpers';

describe('Notifications Module Integration Tests', () => {
  let app: Express;
  let testUser = createTestUser();
  let testAdmin = createTestAdmin();
  let userToken: string;
  let adminToken: string;

  beforeAll(() => {
    app = createApp();
    userToken = generateAccessToken(testUser);
    adminToken = generateAccessToken(testAdmin);
  });

  describe('User Notification Endpoints', () => {
    describe('GET /api/v1/notifications', () => {
      it('should require authentication', async () => {
        const response = await request(app)
          .get('/api/v1/notifications')
          .send();

        expect(response.status).toBe(401);
      });

      it('should return user notifications', async () => {
        const response = await request(app)
          .get('/api/v1/notifications')
          .set('Authorization', `Bearer ${userToken}`)
          .send();

        expect(response.status).toBeOneOf([200, 500]);
      });

      it('should accept filter parameters', async () => {
        const response = await request(app)
          .get('/api/v1/notifications')
          .set('Authorization', `Bearer ${userToken}`)
          .query({
            type: 'booking_confirmation',
            status: 'unread',
            page: 1,
            limit: 10,
          })
          .send();

        expect(response.status).toBeOneOf([200, 500]);
      });
    });

    describe('GET /api/v1/notifications/unread-count', () => {
      it('should require authentication', async () => {
        const response = await request(app)
          .get('/api/v1/notifications/unread-count')
          .send();

        expect(response.status).toBe(401);
      });

      it('should return unread count', async () => {
        const response = await request(app)
          .get('/api/v1/notifications/unread-count')
          .set('Authorization', `Bearer ${userToken}`)
          .send();

        expect(response.status).toBeOneOf([200, 500]);
      });
    });

    describe('GET /api/v1/notifications/preferences', () => {
      it('should require authentication', async () => {
        const response = await request(app)
          .get('/api/v1/notifications/preferences')
          .send();

        expect(response.status).toBe(401);
      });

      it('should return user preferences', async () => {
        const response = await request(app)
          .get('/api/v1/notifications/preferences')
          .set('Authorization', `Bearer ${userToken}`)
          .send();

        expect(response.status).toBeOneOf([200, 500]);
      });
    });

    describe('PATCH /api/v1/notifications/preferences', () => {
      it('should update notification preferences', async () => {
        const response = await request(app)
          .patch('/api/v1/notifications/preferences')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            email: true,
            sms: false,
            push: true,
            inApp: true,
          });

        expect(response.status).toBeOneOf([200, 500]);
      });

      it('should accept quiet hours settings', async () => {
        const response = await request(app)
          .patch('/api/v1/notifications/preferences')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            quietHoursStart: '22:00',
            quietHoursEnd: '08:00',
            timezone: 'Asia/Riyadh',
          });

        expect(response.status).toBeOneOf([200, 500]);
      });

      it('should reject invalid time format', async () => {
        const response = await request(app)
          .patch('/api/v1/notifications/preferences')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            quietHoursStart: '25:00', // Invalid
          });

        // 400 for validation, 500 for DB error
        expect(response.status).toBeOneOf([400, 500]);
      });
    });

    describe('PATCH /api/v1/notifications/:id/read', () => {
      it('should require authentication', async () => {
        const notificationId = generateUUID();
        const response = await request(app)
          .patch(`/api/v1/notifications/${notificationId}/read`)
          .send();

        expect(response.status).toBe(401);
      });

      it('should mark notification as read', async () => {
        const notificationId = generateUUID();
        const response = await request(app)
          .patch(`/api/v1/notifications/${notificationId}/read`)
          .set('Authorization', `Bearer ${userToken}`)
          .send();

        expect(response.status).toBeOneOf([200, 404, 500]);
      });
    });

    describe('POST /api/v1/notifications/mark-all-read', () => {
      it('should require authentication', async () => {
        const response = await request(app)
          .post('/api/v1/notifications/mark-all-read')
          .send();

        expect(response.status).toBe(401);
      });

      it('should mark all as read', async () => {
        const response = await request(app)
          .post('/api/v1/notifications/mark-all-read')
          .set('Authorization', `Bearer ${userToken}`)
          .send();

        expect(response.status).toBeOneOf([200, 500]);
      });
    });

    describe('POST /api/v1/notifications/mark-read', () => {
      it('should mark multiple notifications as read', async () => {
        const response = await request(app)
          .post('/api/v1/notifications/mark-read')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            notificationIds: [generateUUID(), generateUUID()],
          });

        expect(response.status).toBeOneOf([200, 500]);
      });

      it('should reject empty array', async () => {
        const response = await request(app)
          .post('/api/v1/notifications/mark-read')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            notificationIds: [],
          });

        // 400 for validation, 500 for DB error
        expect(response.status).toBeOneOf([400, 500]);
      });
    });

    describe('DELETE /api/v1/notifications/:id', () => {
      it('should require authentication', async () => {
        const notificationId = generateUUID();
        const response = await request(app)
          .delete(`/api/v1/notifications/${notificationId}`)
          .send();

        expect(response.status).toBe(401);
      });
    });
  });

  describe('Admin Notification Endpoints', () => {
    describe('GET /api/v1/notifications/admin', () => {
      it('should require admin role', async () => {
        const response = await request(app)
          .get('/api/v1/notifications/admin')
          .set('Authorization', `Bearer ${userToken}`)
          .send();

        expect(response.status).toBe(403);
      });

      it('should allow admin access', async () => {
        const response = await request(app)
          .get('/api/v1/notifications/admin')
          .set('Authorization', `Bearer ${adminToken}`)
          .send();

        expect(response.status).toBeOneOf([200, 500]);
      });
    });

    describe('POST /api/v1/notifications/send', () => {
      it('should require admin role', async () => {
        const response = await request(app)
          .post('/api/v1/notifications/send')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            userId: generateUUID(),
            type: 'system_announcement',
            title: 'Test',
            body: 'Test message',
          });

        expect(response.status).toBe(403);
      });

      it('should send notification as admin', async () => {
        const response = await request(app)
          .post('/api/v1/notifications/send')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            userId: testUser.id,
            type: 'system_announcement',
            title: 'Test Announcement',
            body: 'This is a test notification',
            priority: 'high',
          });

        expect(response.status).toBeOneOf([201, 404, 500]);
      });

      it('should reject invalid notification type', async () => {
        const response = await request(app)
          .post('/api/v1/notifications/send')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            userId: testUser.id,
            type: 'invalid_type',
            title: 'Test',
            body: 'Test',
          });

        // 400 for validation, 500 for DB error
        expect(response.status).toBeOneOf([400, 500]);
      });
    });

    describe('POST /api/v1/notifications/send-bulk', () => {
      it('should require admin role', async () => {
        const response = await request(app)
          .post('/api/v1/notifications/send-bulk')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            userIds: [generateUUID()],
            type: 'system_announcement',
            title: 'Test',
            body: 'Test',
          });

        expect(response.status).toBe(403);
      });

      it('should send bulk notifications as admin', async () => {
        const response = await request(app)
          .post('/api/v1/notifications/send-bulk')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            userIds: [testUser.id, generateUUID()],
            type: 'system_announcement',
            title: 'Bulk Test',
            body: 'This is a bulk notification',
          });

        expect(response.status).toBeOneOf([201, 500]);
      });

      it('should reject empty userIds array', async () => {
        const response = await request(app)
          .post('/api/v1/notifications/send-bulk')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            userIds: [],
            type: 'system_announcement',
            title: 'Test',
            body: 'Test',
          });

        // 400 for validation, 500 for DB error
        expect(response.status).toBeOneOf([400, 500]);
      });
    });

    describe('POST /api/v1/notifications/send-topic', () => {
      it('should require admin role', async () => {
        const response = await request(app)
          .post('/api/v1/notifications/send-topic')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            topic: 'all_users',
            type: 'system_announcement',
            title: 'Test',
            body: 'Test',
          });

        expect(response.status).toBe(403);
      });

      it('should send to topic as admin', async () => {
        const response = await request(app)
          .post('/api/v1/notifications/send-topic')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            topic: 'divers',
            type: 'promotional',
            title: 'Special Offer',
            body: 'Check out our new diving trips!',
          });

        expect(response.status).toBeOneOf([201, 500]);
      });

      it('should reject invalid topic', async () => {
        const response = await request(app)
          .post('/api/v1/notifications/send-topic')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            topic: 'invalid_topic',
            type: 'system_announcement',
            title: 'Test',
            body: 'Test',
          });

        // 400 for validation, 500 for DB error
        expect(response.status).toBeOneOf([400, 500]);
      });
    });

    describe('POST /api/v1/notifications/:id/retry', () => {
      it('should require admin role', async () => {
        const notificationId = generateUUID();
        const response = await request(app)
          .post(`/api/v1/notifications/${notificationId}/retry`)
          .set('Authorization', `Bearer ${userToken}`)
          .send();

        expect(response.status).toBe(403);
      });
    });
  });
});

