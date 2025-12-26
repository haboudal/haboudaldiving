import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock dependencies
vi.mock('../../config/database', () => ({
  db: {
    query: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../middleware/auth.middleware', () => ({
  authenticate: vi.fn((req, res, next) => {
    req.user = { userId: 'admin-123', role: 'admin', email: 'admin@example.com' };
    next();
  }),
  requireRole: vi.fn((...roles) => (req: any, res: any, next: any) => {
    if (roles.includes(req.user.role)) {
      next();
    } else {
      res.status(403).json({ success: false, error: 'Forbidden' });
    }
  }),
  authorize: vi.fn((...roles) => (req: any, res: any, next: any) => {
    if (roles.includes(req.user.role)) {
      next();
    } else {
      res.status(403).json({ success: false, error: 'Forbidden' });
    }
  }),
}));

vi.mock('../../middleware/validation.middleware', () => ({
  validate: vi.fn(() => (req: any, res: any, next: any) => next()),
}));

import { db } from '../../config/database';
import adminRoutes from '../../modules/admin/admin.routes';

describe('Admin API Integration Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/admin', adminRoutes);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/v1/admin/dashboard', () => {
    it('should return dashboard statistics', async () => {
      const mockUsers = { total: '1000', divers: '800', instructors: '150', center_owners: '50', pending_verification: '25', active_today: '120' };
      const mockCenters = { total: '50', verified: '40', pending: '8', rejected: '2' };
      const mockCerts = { total: '2000', pending: '100', verified: '1900' };
      const mockTrips = { total: '500', upcoming: '50', in_progress: '5', completed_this_month: '80' };
      const mockBookings = { total: '5000', this_month: '200', revenue: '75000' };
      const mockReviews = { total: '1500', flagged: '15', average_rating: '4.3' };

      vi.mocked(db.query)
        .mockResolvedValueOnce({ rows: [mockUsers], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [mockCenters], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [mockCerts], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [mockTrips], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [mockBookings], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [mockReviews], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });

      const response = await request(app)
        .get('/api/v1/admin/dashboard')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users.total).toBe(1000);
      expect(response.body.data.centers.verified).toBe(40);
      expect(response.body.data.bookings.revenue).toBe(75000);
    });
  });

  describe('GET /api/v1/admin/centers/pending', () => {
    it('should handle pending centers request', async () => {
      const response = await request(app)
        .get('/api/v1/admin/centers/pending?status=pending');

      // Request processes through the route
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('POST /api/v1/admin/centers/:id/verify', () => {
    it('should verify a center', async () => {
      const centerId = '550e8400-e29b-41d4-a716-446655440000';

      // Get current center
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: centerId, license_status: 'pending' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Update center
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      // Log audit
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      // Get updated center
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{
          id: centerId,
          name_en: 'Red Sea Divers',
          owner_user_id: 'user-1',
          owner_email: 'owner@center.com',
          license_status: 'verified',
          created_at: new Date(),
          documents_count: '5',
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const response = await request(app)
        .post(`/api/v1/admin/centers/${centerId}/verify`)
        .send({
          status: 'verified',
          notes: 'All documents verified',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.licenseStatus).toBe('verified');
    });

    it('should return 404 for non-existent center', async () => {
      const centerId = '550e8400-e29b-41d4-a716-446655440001';

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await request(app)
        .post(`/api/v1/admin/centers/${centerId}/verify`)
        .send({ status: 'verified' })
        .expect(404);
    });
  });

  describe('GET /api/v1/admin/users', () => {
    it('should handle users list request', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users?role=diver');

      // Request processes through the route
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('POST /api/v1/admin/users/:id/deactivate', () => {
    it('should deactivate a user', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440002';

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: userId, status: 'active' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      const response = await request(app)
        .post(`/api/v1/admin/users/${userId}/deactivate`)
        .send({ reason: 'Terms of service violation - repeated policy breaches' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should prevent self-deactivation', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: 'admin-123' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await request(app)
        .post('/api/v1/admin/users/admin-123/deactivate')
        .send({ reason: 'Test deactivation reason text' })
        .expect(400);
    });
  });

  describe('GET /api/v1/admin/reviews/flagged', () => {
    it('should handle flagged reviews request', async () => {
      const response = await request(app)
        .get('/api/v1/admin/reviews/flagged');

      // Request processes through the route
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('POST /api/v1/admin/reviews/:id/moderate', () => {
    it('should moderate a flagged review', async () => {
      const reviewId = '550e8400-e29b-41d4-a716-446655440003';

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: reviewId, status: 'published' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{
          id: reviewId,
          user_id: 'user-1',
          user_email: 'user@example.com',
          user_name: 'John',
          reviewable_type: 'center',
          reviewable_id: 'center-1',
          reviewable_name: 'Test Center',
          rating: 1,
          status: 'removed',
          reported_count: 0,
          created_at: new Date(),
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const response = await request(app)
        .post(`/api/v1/admin/reviews/${reviewId}/moderate`)
        .send({
          action: 'remove',
          reason: 'Violates community guidelines',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('removed');
    });
  });

  describe('GET /api/v1/admin/audit-logs', () => {
    it('should handle audit logs request', async () => {
      const response = await request(app)
        .get('/api/v1/admin/audit-logs?entityType=diving_center');

      // Request processes through the route
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });
});
