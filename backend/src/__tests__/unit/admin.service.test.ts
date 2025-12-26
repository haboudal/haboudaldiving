import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before importing the service
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

import { AdminService } from '../../modules/admin/admin.service';
import { db } from '../../config/database';

describe('AdminService', () => {
  let adminService: AdminService;

  beforeEach(() => {
    adminService = new AdminService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getDashboardStats', () => {
    it('should return comprehensive dashboard statistics', async () => {
      const mockUsers = {
        total: '1000',
        divers: '800',
        instructors: '150',
        center_owners: '50',
        pending_verification: '25',
        active_today: '120',
      };

      const mockCenters = {
        total: '50',
        verified: '40',
        pending: '8',
        rejected: '2',
      };

      const mockCerts = {
        total: '2000',
        pending: '100',
        verified: '1900',
      };

      const mockTrips = {
        total: '500',
        upcoming: '50',
        in_progress: '5',
        completed_this_month: '80',
      };

      const mockBookings = {
        total: '5000',
        this_month: '200',
        revenue: '75000',
      };

      const mockReviews = {
        total: '1500',
        flagged: '15',
        average_rating: '4.3',
      };

      vi.mocked(db.query)
        .mockResolvedValueOnce({ rows: [mockUsers], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [mockCenters], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [mockCerts], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [mockTrips], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [mockBookings], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [mockReviews], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });

      const result = await adminService.getDashboardStats();

      expect(result.users.total).toBe(1000);
      expect(result.users.divers).toBe(800);
      expect(result.centers.verified).toBe(40);
      expect(result.certifications.pending).toBe(100);
      expect(result.trips.upcoming).toBe(50);
      expect(result.bookings.revenue).toBe(75000);
      expect(result.reviews.averageRating).toBe(4.3);
    });
  });

  describe('getPendingCenters', () => {
    it('should return paginated pending centers', async () => {
      const mockCenters = [
        {
          id: 'center-1',
          name_en: 'Red Sea Divers',
          name_ar: 'غواصين البحر الأحمر',
          owner_user_id: 'user-1',
          owner_email: 'owner@center.com',
          srsa_license_number: 'SRSA-001',
          license_expiry_date: new Date('2026-12-31'),
          license_status: 'pending',
          city: 'Jeddah',
          created_at: new Date(),
          documents_count: '5',
        },
      ];

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ count: '10' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: mockCenters,
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await adminService.getPendingCenters({ status: 'pending', page: 1, limit: 20 });

      expect(result.total).toBe(10);
      expect(result.centers).toHaveLength(1);
      expect(result.centers[0].nameEn).toBe('Red Sea Divers');
      expect(result.centers[0].documentsCount).toBe(5);
    });

    it('should filter by search term', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ count: '0' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await adminService.getPendingCenters({ status: 'pending', search: 'Red Sea', page: 1, limit: 10 });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.arrayContaining(['pending', '%Red Sea%'])
      );
    });
  });

  describe('verifyCenter', () => {
    it('should throw NotFoundError when center does not exist', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(
        adminService.verifyCenter('non-existent', 'admin-123', { status: 'verified' })
      ).rejects.toThrow('Diving center');
    });

    it('should verify center and log audit', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: 'center-1', license_status: 'pending' }],
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

      // Fetch updated center
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{
          id: 'center-1',
          name_en: 'Test Center',
          owner_user_id: 'user-1',
          owner_email: 'owner@test.com',
          license_status: 'verified',
          created_at: new Date(),
          documents_count: '3',
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await adminService.verifyCenter('center-1', 'admin-123', {
        status: 'verified',
        notes: 'All documents verified',
      });

      expect(result.licenseStatus).toBe('verified');
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('audit_logs'),
        expect.any(Array)
      );
    });
  });

  describe('listUsers', () => {
    it('should return paginated users with filters', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'diver@example.com',
          role: 'diver',
          status: 'active',
          preferred_language: 'en',
          created_at: new Date(),
          updated_at: new Date(),
          first_name_en: 'John',
          last_name_en: 'Doe',
          certifications_count: '3',
          bookings_count: '10',
        },
      ];

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ count: '100' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: mockUsers,
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await adminService.listUsers({ role: 'diver', page: 1, limit: 20 });

      expect(result.total).toBe(100);
      expect(result.users).toHaveLength(1);
      expect(result.users[0].email).toBe('diver@example.com');
      expect(result.users[0].certificationsCount).toBe(3);
    });
  });

  describe('updateUser', () => {
    it('should throw ValidationError when trying to demote self', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: 'admin-123', role: 'admin' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(
        adminService.updateUser('admin-123', 'admin-123', { role: 'diver' })
      ).rejects.toThrow('own admin role');
    });

    it('should update user and log audit', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: 'user-1', role: 'diver', status: 'active' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Update user
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

      // Get user details
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{
          id: 'user-1',
          email: 'user@example.com',
          role: 'instructor',
          status: 'active',
          preferred_language: 'en',
          created_at: new Date(),
          updated_at: new Date(),
          certifications_count: '5',
          bookings_count: '20',
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await adminService.updateUser('user-1', 'admin-123', { role: 'instructor' });

      expect(result.role).toBe('instructor');
    });
  });

  describe('deactivateUser', () => {
    it('should throw ValidationError when trying to deactivate self', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: 'admin-123' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(
        adminService.deactivateUser('admin-123', 'admin-123', { reason: 'Test' })
      ).rejects.toThrow('own account');
    });

    it('should deactivate user and log audit', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: 'user-1', status: 'active' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Update user status
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

      await expect(
        adminService.deactivateUser('user-1', 'admin-123', { reason: 'Violation of TOS' })
      ).resolves.toBeUndefined();

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'deactivated'"),
        expect.any(Array)
      );
    });
  });

  describe('getFlaggedReviews', () => {
    it('should return reviews sorted by report count', async () => {
      const mockReviews = [
        {
          id: 'review-1',
          user_id: 'user-1',
          user_email: 'user@example.com',
          user_name: 'John Doe',
          reviewable_type: 'center',
          reviewable_id: 'center-1',
          reviewable_name: 'Red Sea Divers',
          rating: 1,
          title: 'Terrible experience',
          content: 'Inappropriate content here',
          reported_count: 10,
          status: 'published',
          created_at: new Date(),
        },
      ];

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ count: '15' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: mockReviews,
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await adminService.getFlaggedReviews({ minReports: 3, page: 1, limit: 10 });

      expect(result.total).toBe(15);
      expect(result.reviews).toHaveLength(1);
      expect(result.reviews[0].reportedCount).toBe(10);
    });
  });

  describe('moderateReview', () => {
    it('should hide review and log audit', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: 'review-1', status: 'published' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Update review
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

      // Fetch updated review
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{
          id: 'review-1',
          user_id: 'user-1',
          user_email: 'user@example.com',
          user_name: 'John',
          reviewable_type: 'center',
          reviewable_id: 'center-1',
          reviewable_name: 'Test Center',
          rating: 1,
          status: 'hidden',
          reported_count: 0,
          created_at: new Date(),
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await adminService.moderateReview('review-1', 'admin-123', {
        action: 'hide',
        reason: 'Contains inappropriate language',
      });

      expect(result.status).toBe('hidden');
    });
  });

  describe('getAuditLogs', () => {
    it('should return paginated audit logs with filters', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          user_id: 'admin-123',
          user_email: 'admin@example.com',
          action: 'verify_center',
          entity_type: 'diving_center',
          entity_id: 'center-1',
          new_values: { status: 'verified' },
          created_at: new Date(),
        },
      ];

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ count: '50' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: mockLogs,
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await adminService.getAuditLogs({
        action: 'verify',
        entityType: 'diving_center',
        page: 1,
        limit: 20,
      });

      expect(result.total).toBe(50);
      expect(result.logs).toHaveLength(1);
      expect(result.logs[0].action).toBe('verify_center');
    });
  });
});
