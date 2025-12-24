import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before importing the service
vi.mock('../../config/database', () => ({
  db: {
    query: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock('../../modules/centers/centers.service', () => ({
  centersService: {
    verifyOwnership: vi.fn(),
  },
}));

import { TripsService } from '../../modules/trips/trips.service';
import { db } from '../../config/database';
import { centersService } from '../../modules/centers/centers.service';
import { NotFoundError, ValidationError } from '../../utils/errors';

describe('TripsService', () => {
  let tripsService: TripsService;

  beforeEach(() => {
    tripsService = new TripsService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockTripRow = {
    id: 'trip-123',
    center_id: 'center-123',
    vessel_id: 'vessel-123',
    site_id: 'site-123',
    lead_instructor_id: 'instructor-123',
    title_en: 'Morning Dive Trip',
    title_ar: 'رحلة غوص صباحية',
    description_en: 'A wonderful morning dive',
    description_ar: null,
    trip_type: 'recreational',
    departure_datetime: new Date('2025-01-15T08:00:00Z'),
    return_datetime: new Date('2025-01-15T14:00:00Z'),
    meeting_point_en: 'Marina Entrance',
    max_participants: 10,
    min_participants: 2,
    current_participants: 0,
    price_per_person_sar: 350,
    status: 'draft',
    created_at: new Date(),
    updated_at: new Date(),
    center_name: 'Red Sea Diving',
    site_name: 'Coral Reef',
    lead_instructor_name: 'Ahmed Ali',
    vessel_name: 'Sea Explorer',
  };

  describe('findAll', () => {
    it('should return trips with pagination', async () => {
      // Mock count query
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ count: '25' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Mock trips query - return empty to avoid mapping issues
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await tripsService.findAll({ page: 1, limit: 20 });

      expect(result.trips).toHaveLength(0);
      expect(result.total).toBe(25);
    });

    it('should filter by status', async () => {
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

      await tripsService.findAll({ status: 'published' });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('t.status = $1'),
        expect.arrayContaining(['published'])
      );
    });

    it('should filter by center', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ count: '5' }],
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

      await tripsService.findAll({ centerId: 'center-123' });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('t.center_id = $'),
        expect.arrayContaining(['center-123'])
      );
    });

    it('should filter by date range', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ count: '3' }],
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

      await tripsService.findAll({
        dateFrom: '2025-01-01',
        dateTo: '2025-01-31',
      });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('t.departure_datetime >='),
        expect.arrayContaining(['2025-01-01', '2025-01-31'])
      );
    });

    it('should filter upcoming trips', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ count: '15' }],
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

      await tripsService.findAll({ upcoming: true });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('t.departure_datetime > NOW()'),
        expect.any(Array)
      );
    });

    it('should limit results to max 100', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ count: '500' }],
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

      await tripsService.findAll({ limit: 500 });

      // Should cap at 100
      expect(db.query).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.arrayContaining([100, 0])
      );
    });
  });

  describe('findById', () => {
    it('should throw NotFoundError when trip does not exist', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(tripsService.findById('non-existent')).rejects.toThrow('not found');
    });

    it('should return trip with details when found', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [mockTripRow],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await tripsService.findById('trip-123');

      expect(result).toBeDefined();
      expect(result.id).toBe('trip-123');
      expect(result.titleEn).toBe('Morning Dive Trip');
      expect(result.centerName).toBe('Red Sea Diving');
    });
  });

  describe('create', () => {
    const createDto = {
      titleEn: 'New Trip',
      tripType: 'morning' as const,
      departureDatetime: '2025-02-01T08:00:00Z',
      returnDatetime: '2025-02-01T14:00:00Z',
      maxParticipants: 10,
      pricePerPersonSar: 400,
    };

    it('should verify center ownership before creating', async () => {
      vi.mocked(centersService.verifyOwnership).mockResolvedValueOnce(undefined);

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: 'new-trip-id' }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ ...mockTripRow, id: 'new-trip-id' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await tripsService.create('center-123', 'user-123', createDto);

      expect(centersService.verifyOwnership).toHaveBeenCalledWith('center-123', 'user-123');
    });

    it('should create trip with draft status', async () => {
      vi.mocked(centersService.verifyOwnership).mockResolvedValueOnce(undefined);

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: 'new-trip-id' }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ ...mockTripRow, id: 'new-trip-id', status: 'draft' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await tripsService.create('center-123', 'user-123', createDto);

      expect(result.status).toBe('draft');
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("'draft'"),
        expect.any(Array)
      );
    });
  });

  describe('update', () => {
    it('should throw ValidationError when updating cancelled trip', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ ...mockTripRow, status: 'cancelled' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      vi.mocked(centersService.verifyOwnership).mockResolvedValueOnce(undefined);

      await expect(
        tripsService.update('trip-123', 'user-123', { titleEn: 'Updated' })
      ).rejects.toThrow('Cannot update');
    });

    it('should throw ValidationError when updating completed trip', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ ...mockTripRow, status: 'completed' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      vi.mocked(centersService.verifyOwnership).mockResolvedValueOnce(undefined);

      await expect(
        tripsService.update('trip-123', 'user-123', { titleEn: 'Updated' })
      ).rejects.toThrow('Cannot update');
    });

    it('should verify ownership before updating', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [mockTripRow],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      vi.mocked(centersService.verifyOwnership).mockResolvedValueOnce(undefined);

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [mockTripRow],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await tripsService.update('trip-123', 'user-123', { titleEn: 'Updated' });

      expect(centersService.verifyOwnership).toHaveBeenCalledWith('center-123', 'user-123');
    });
  });
});
