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

import { DiveLogsService } from '../../modules/dive-logs/dive-logs.service';
import { db } from '../../config/database';

describe('DiveLogsService', () => {
  let diveLogsService: DiveLogsService;

  beforeEach(() => {
    diveLogsService = new DiveLogsService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getDiveLogById', () => {
    it('should return dive log when found', async () => {
      const mockDiveLog = {
        id: 'log-123',
        user_id: 'user-123',
        dive_number: 42,
        dive_date: '2025-01-15',
        max_depth_meters: '25.5',
        bottom_time_minutes: 45,
        water_temp_c: 24,
        site_name: 'Coral Reef',
        verified_by_instructor: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [mockDiveLog],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await diveLogsService.getDiveLogById('log-123', 'user-123');

      expect(result.id).toBe('log-123');
      expect(result.diveNumber).toBe(42);
      expect(result.maxDepthMeters).toBe(25.5);
    });

    it('should throw NotFoundError when dive log does not exist', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(diveLogsService.getDiveLogById('non-existent')).rejects.toThrow('not found');
    });

    it('should throw ForbiddenError if user does not own the dive log', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{
          id: 'log-123',
          user_id: 'other-user',
          dive_date: '2025-01-15',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(diveLogsService.getDiveLogById('log-123', 'user-123')).rejects.toThrow('permission');
    });
  });

  describe('getUserDiveLogs', () => {
    it('should query database with correct parameters', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ total: '0' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await diveLogsService.getUserDiveLogs('user-123', { page: 1, limit: 20 });

      expect(result.total).toBe(0);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('dl.user_id = $1'),
        expect.arrayContaining(['user-123'])
      );
    });

    it('should filter by date range', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ total: '0' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await diveLogsService.getUserDiveLogs('user-123', {
        dateFrom: '2025-01-01',
        dateTo: '2025-01-31',
      });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('dl.dive_date >='),
        expect.arrayContaining(['user-123', '2025-01-01', '2025-01-31'])
      );
    });

    it('should filter by depth range', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ total: '0' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await diveLogsService.getUserDiveLogs('user-123', {
        minDepth: 20,
        maxDepth: 40,
      });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('dl.max_depth_meters >='),
        expect.arrayContaining([20, 40])
      );
    });
  });

  describe('getUserDiveStatistics', () => {
    it('should return comprehensive dive statistics', async () => {
      const mockStats = {
        total_dives: '50',
        total_bottom_time: '2250',
        deepest_dive: '42.5',
        avg_depth: '22.3',
        avg_bottom_time: '45',
        total_sites: '15',
        most_recent_dive: '2025-01-20',
        certification_dives: '5',
        night_dives: '8',
        deep_dives: '12',
      };

      const mockFavoriteSite = {
        id: 'site-123',
        name: 'Coral Gardens',
        dive_count: '15',
      };

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [mockStats],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [mockFavoriteSite],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ month: '2025-01', count: '5' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ year: 2025, count: '50' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await diveLogsService.getUserDiveStatistics('user-123');

      expect(result.totalDives).toBe(50);
      expect(result.deepestDiveMeters).toBe(42.5);
      expect(result.favoritesSite?.name).toBe('Coral Gardens');
      expect(result.nightDives).toBe(8);
    });
  });

  describe('createDiveLog', () => {
    it('should auto-increment dive number if not provided', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ next_number: 43 }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{
          id: 'new-log',
          user_id: 'user-123',
          dive_number: 43,
          dive_date: '2025-01-20',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      // Update profile stats
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ total_logged_dives: '43', deepest_dive_meters: '42.5' }],
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

      const result = await diveLogsService.createDiveLog('user-123', {
        diveDate: '2025-01-20',
        maxDepthMeters: 25,
        bottomTimeMinutes: 45,
      });

      expect(result.diveNumber).toBe(43);
    });

    it('should validate site exists if provided', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ next_number: 1 }],
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

      await expect(
        diveLogsService.createDiveLog('user-123', {
          diveDate: '2025-01-20',
          siteId: 'non-existent-site',
        })
      ).rejects.toThrow('Dive site not found');
    });

    it('should calculate air consumption rate when pressure data provided', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ next_number: 1 }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{
          id: 'new-log',
          user_id: 'user-123',
          dive_number: 1,
          dive_date: '2025-01-20',
          air_consumption_rate: '0.5',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      // Update profile stats
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ total_logged_dives: '1', deepest_dive_meters: '20' }],
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

      const result = await diveLogsService.createDiveLog('user-123', {
        diveDate: '2025-01-20',
        maxDepthMeters: 20,
        avgDepthMeters: 15,
        bottomTimeMinutes: 45,
        startPressureBar: 200,
        endPressureBar: 50,
      });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('air_consumption_rate'),
        expect.any(Array)
      );
    });
  });

  describe('updateDiveLog', () => {
    it('should throw ValidationError when updating verified dive log', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{
          id: 'log-123',
          user_id: 'user-123',
          verified_by_instructor: true,
          dive_date: '2025-01-15',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(
        diveLogsService.updateDiveLog('user-123', 'log-123', { notes: 'Updated notes' })
      ).rejects.toThrow('verified dive log');
    });

    it('should successfully update dive log', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{
          id: 'log-123',
          user_id: 'user-123',
          verified_by_instructor: false,
          dive_date: '2025-01-15',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{
          id: 'log-123',
          user_id: 'user-123',
          notes: 'Updated notes',
          dive_date: '2025-01-15',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      // Update profile stats
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ total_logged_dives: '10', deepest_dive_meters: '30' }],
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

      const result = await diveLogsService.updateDiveLog('user-123', 'log-123', { notes: 'Updated notes' });

      expect(result.notes).toBe('Updated notes');
    });
  });

  describe('deleteDiveLog', () => {
    it('should throw ValidationError when deleting verified dive log', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{
          id: 'log-123',
          user_id: 'user-123',
          verified_by_instructor: true,
          dive_date: '2025-01-15',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(diveLogsService.deleteDiveLog('user-123', 'log-123')).rejects.toThrow('verified dive log');
    });
  });

  describe('verifyDiveLog', () => {
    it('should throw ForbiddenError if instructor is not assigned', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{
          id: 'log-123',
          instructor_id: 'other-instructor',
          verified_by_instructor: false,
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(
        diveLogsService.verifyDiveLog('instructor-123', 'log-123')
      ).rejects.toThrow('not the assigned instructor');
    });

    it('should throw ValidationError if already verified', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{
          id: 'log-123',
          instructor_id: 'instructor-123',
          verified_by_instructor: true,
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(
        diveLogsService.verifyDiveLog('instructor-123', 'log-123')
      ).rejects.toThrow('already verified');
    });

    it('should successfully verify dive log', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{
          id: 'log-123',
          instructor_id: 'instructor-123',
          verified_by_instructor: false,
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{
          id: 'log-123',
          user_id: 'user-123',
          verified_by_instructor: true,
          signature_url: 'https://signatures.com/sig.png',
          dive_date: '2025-01-15',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      const result = await diveLogsService.verifyDiveLog('instructor-123', 'log-123', 'https://signatures.com/sig.png');

      expect(result.verifiedByInstructor).toBe(true);
      expect(result.signatureUrl).toBe('https://signatures.com/sig.png');
    });
  });

  describe('importFromComputer', () => {
    it('should import multiple dives and update stats', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ max_number: 10 }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Insert dive 1
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: 'imported-1' }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      // Insert dive 2
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: 'imported-2' }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      // Update profile stats
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ total_logged_dives: '12', deepest_dive_meters: '35' }],
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

      const result = await diveLogsService.importFromComputer('user-123', {
        computerBrand: 'Suunto',
        computerModel: 'D5',
        dives: [
          { diveDate: '2025-01-15', maxDepthMeters: 25, bottomTimeMinutes: 45 },
          { diveDate: '2025-01-16', maxDepthMeters: 30, bottomTimeMinutes: 50 },
        ],
      });

      expect(result.imported).toBe(2);
      expect(result.diveLogIds).toEqual(['imported-1', 'imported-2']);
    });
  });
});
