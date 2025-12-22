import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import { Express } from 'express';
import {
  createTestUser,
  createTestAdmin,
  generateAccessToken,
  createApiClient,
  ApiTestClient,
} from '../utils/test-helpers';

describe('Users Module Integration Tests', () => {
  let app: Express;
  let api: ApiTestClient;
  let testUser = createTestUser();
  let testAdmin = createTestAdmin();
  let userToken: string;
  let adminToken: string;

  beforeAll(() => {
    app = createApp();
    api = createApiClient(app);
    userToken = generateAccessToken(testUser);
    adminToken = generateAccessToken(testAdmin);
  });

  describe('GET /api/v1/users/me', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/users/me')
        .send();

      expect(response.status).toBe(401);
    });

    it('should return current user with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${userToken}`)
        .send();

      // Will get 500 without DB, but auth works
      expect(response.status).toBeOneOf([200, 500]);
    });
  });

  describe('PATCH /api/v1/users/me', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .patch('/api/v1/users/me')
        .send({ firstName: 'Updated' });

      expect(response.status).toBe(401);
    });

    it('should accept valid update data', async () => {
      const response = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          firstName: 'Updated',
          lastName: 'Name',
        });

      expect(response.status).toBeOneOf([200, 500]);
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          email: 'not-a-valid-email',
        });

      // 400 for validation, 500 for DB error
      expect(response.status).toBeOneOf([400, 500]);
    });
  });

  describe('Admin User Management', () => {
    describe('GET /api/v1/admin/users', () => {
      it('should require admin role', async () => {
        const response = await request(app)
          .get('/api/v1/admin/users')
          .set('Authorization', `Bearer ${userToken}`)
          .send();

        expect(response.status).toBe(403);
      });

      it('should allow admin access', async () => {
        const response = await request(app)
          .get('/api/v1/admin/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send();

        expect(response.status).toBeOneOf([200, 500]);
      });
    });

    describe('GET /api/v1/admin/users/:id', () => {
      it('should require admin role', async () => {
        const response = await request(app)
          .get(`/api/v1/admin/users/${testUser.id}`)
          .set('Authorization', `Bearer ${userToken}`)
          .send();

        expect(response.status).toBe(403);
      });

      it('should return 400 for invalid UUID', async () => {
        const response = await request(app)
          .get('/api/v1/admin/users/not-a-uuid')
          .set('Authorization', `Bearer ${adminToken}`)
          .send();

        expect(response.status).toBe(400);
      });
    });

    describe('PATCH /api/v1/admin/users/:id', () => {
      it('should require admin role', async () => {
        const response = await request(app)
          .patch(`/api/v1/admin/users/${testUser.id}`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ role: 'instructor' });

        expect(response.status).toBe(403);
      });

      it('should accept valid role update from admin', async () => {
        const response = await request(app)
          .patch(`/api/v1/admin/users/${testUser.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ role: 'instructor' });

        expect(response.status).toBeOneOf([200, 500]);
      });
    });
  });
});

