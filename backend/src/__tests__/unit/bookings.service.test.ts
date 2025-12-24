import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before importing the service
vi.mock('../../config/database', () => ({
  db: {
    query: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock('../../modules/divers/divers.service', () => ({
  diversService: {
    findByUserId: vi.fn(),
  },
}));

vi.mock('../../modules/centers/centers.service', () => ({
  centersService: {
    verifyOwnership: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock('../../modules/trips/trips.service', () => ({
  tripsService: {
    findById: vi.fn(),
  },
}));

import { BookingsService } from '../../modules/trips/bookings/bookings.service';
import { db } from '../../config/database';

describe('BookingsService', () => {
  let bookingsService: BookingsService;

  beforeEach(() => {
    bookingsService = new BookingsService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findByTrip', () => {
    it('should return bookings for a trip with pagination', async () => {
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

      const result = await bookingsService.findByTrip('trip-123', { page: 1, limit: 10 });

      expect(result.total).toBe(5);
      expect(result.bookings).toHaveLength(0);
      expect(db.query).toHaveBeenCalledTimes(2);
    });

    it('should filter by status', async () => {
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

      await bookingsService.findByTrip('trip-123', { status: 'confirmed' });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('b.status = $'),
        expect.arrayContaining(['trip-123', 'confirmed'])
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

      await bookingsService.findByTrip('trip-123', { limit: 500 });

      // Should cap limit at 100
      expect(db.query).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.arrayContaining([100, 0])
      );
    });
  });

  describe('findByUser', () => {
    it('should return bookings for a user with pagination', async () => {
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

      const result = await bookingsService.findByUser('user-123', { page: 1, limit: 20 });

      expect(result.total).toBe(10);
      expect(result.bookings).toHaveLength(0);
    });

    it('should filter by status for user bookings', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ count: '2' }],
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

      await bookingsService.findByUser('user-123', { status: 'pending' });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('b.status = $'),
        expect.arrayContaining(['user-123', 'pending'])
      );
    });
  });

  describe('findById', () => {
    it('should throw NotFoundError when booking does not exist', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(bookingsService.findById('non-existent')).rejects.toThrow('not found');
    });
  });

});

