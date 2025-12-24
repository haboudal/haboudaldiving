import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before importing the service
vi.mock('../../config/database', () => ({
  db: {
    query: vi.fn(),
    transaction: vi.fn(),
  },
}));

import { CentersService } from '../../modules/centers/centers.service';
import { db } from '../../config/database';

describe('CentersService', () => {
  let centersService: CentersService;

  beforeEach(() => {
    centersService = new CentersService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockCenterRow = {
    id: 'center-123',
    owner_user_id: 'user-123',
    name_en: 'Red Sea Diving Center',
    name_ar: 'مركز البحر الأحمر للغوص',
    slug: 'red-sea-diving-center',
    description_en: 'Best diving center in the Red Sea',
    description_ar: null,
    srsa_license_number: 'SRSA-2024-001',
    city: 'Jeddah',
    address_en: '123 Marine Street',
    address_ar: null,
    latitude: 21.5433,
    longitude: 39.1728,
    phone_emergency: '+966500000000',
    email: 'info@redsea-diving.com',
    website: 'https://redsea-diving.com',
    status: 'active',
    rating_average: 4.5,
    total_reviews: 150,
    created_at: new Date(),
    updated_at: new Date(),
  };

  describe('findAll', () => {
    it('should return centers with pagination', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ count: '50' }],
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

      const result = await centersService.findAll({ page: 1, limit: 20 });

      expect(result.total).toBe(50);
      expect(result.centers).toHaveLength(0);
      expect(db.query).toHaveBeenCalledTimes(2);
    });

    it('should filter by city', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ count: '10' }],
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

      await centersService.findAll({ city: 'Jeddah' });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('dc.city = $'),
        expect.arrayContaining(['Jeddah'])
      );
    });

    it('should limit results to max 100', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ count: '200' }],
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

      await centersService.findAll({ limit: 500 });

      expect(db.query).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.arrayContaining([100, 0])
      );
    });

    it('should only return active centers by default', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ count: '30' }],
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

      await centersService.findAll({});

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'active'"),
        expect.any(Array)
      );
    });
  });

  describe('findById', () => {
    it('should throw NotFoundError when center does not exist', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(centersService.findById('non-existent')).rejects.toThrow('not found');
    });

    it('should return center when found', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [mockCenterRow],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await centersService.findById('center-123');

      expect(result).toBeDefined();
      expect(result.id).toBe('center-123');
      expect(result.nameEn).toBe('Red Sea Diving Center');
    });
  });

  describe('create', () => {
    const createDto = {
      nameEn: 'New Diving Center',
      city: 'Riyadh',
      email: 'info@newcenter.com',
    };

    it('should create center with pending_verification status', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: 'new-center-id' }],
        rowCount: 1,
        command: 'INSERT',
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
        rows: [{ ...mockCenterRow, id: 'new-center-id', status: 'pending_verification' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await centersService.create('user-123', createDto);

      expect(result).toBeDefined();
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("'pending_verification'"),
        expect.any(Array)
      );
    });

    it('should update user role to center_owner', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: 'new-center-id' }],
        rowCount: 1,
        command: 'INSERT',
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
        rows: [mockCenterRow],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await centersService.create('user-123', createDto);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("role = 'center_owner'"),
        ['user-123']
      );
    });
  });

  describe('verifyOwnership', () => {
    it('should throw ForbiddenError when user is not owner and not admin', async () => {
      // First query: check ownership - returns empty (not owner)
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Second query: check if admin - returns empty (not admin)
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(centersService.verifyOwnership('center-123', 'user-123')).rejects.toThrow('Not authorized');
    });

    it('should not throw when user is owner', async () => {
      // Query returns the center (user is owner)
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: 'center-123' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(centersService.verifyOwnership('center-123', 'user-123')).resolves.toBeUndefined();
    });

    it('should not throw when user is admin', async () => {
      // First query: check ownership - returns empty (not owner)
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Second query: check if admin - returns the user (is admin)
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: 'user-123' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(centersService.verifyOwnership('center-123', 'user-123')).resolves.toBeUndefined();
    });
  });
});
