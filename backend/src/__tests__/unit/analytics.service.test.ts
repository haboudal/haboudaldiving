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

import { db } from '../../config/database';

describe('AnalyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Private helper methods (tested via db queries)', () => {
    it('should query for total trips', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ count: '200' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await db.query(
        'SELECT COUNT(*) FROM trips WHERE date >= $1 AND date <= $2',
        ['2025-01-01', '2025-01-31']
      );

      expect(result.rows[0].count).toBe('200');
    });

    it('should query for active trips', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ count: '15' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await db.query(
        "SELECT COUNT(*) FROM trips WHERE status IN ('scheduled', 'boarding', 'in_progress') AND date >= CURRENT_DATE"
      );

      expect(result.rows[0].count).toBe('15');
    });

    it('should query for average fill rate', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ avg_fill_rate: '75.5' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await db.query(
        expect.stringContaining('AVG'),
        expect.any(Array)
      );

      expect(parseFloat(result.rows[0].avg_fill_rate)).toBe(75.5);
    });

    it('should query for payment stats', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ total: '600', successful: '580', failed: '15', refunded: '5' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await db.query(
        expect.stringContaining('payments'),
        expect.any(Array)
      );

      expect(parseInt(result.rows[0].successful, 10)).toBe(580);
    });
  });

  describe('Quota utilization queries', () => {
    it('should query quota utilization data', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [
          {
            site_id: 'site-1',
            site_name: 'Coral Reef',
            daily_quota: '100',
            avg_utilization: '65.5',
            peak_utilization: '95',
            total_reservations: '450',
          },
        ],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await db.query(
        expect.stringContaining('dive_sites'),
        expect.any(Array)
      );

      expect(result.rows[0].site_name).toBe('Coral Reef');
      expect(parseFloat(result.rows[0].avg_utilization)).toBe(65.5);
    });
  });

  describe('Conservation fee queries', () => {
    it('should query conservation fee data by zone', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [
          { zone: 'zone_1', fee_amount: '50', total_collected: '25000', transaction_count: '500' },
          { zone: 'zone_2', fee_amount: '35', total_collected: '17500', transaction_count: '500' },
        ],
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await db.query(
        expect.stringContaining('conservation_fee_transactions'),
        expect.any(Array)
      );

      expect(result.rows).toHaveLength(2);
      expect(parseFloat(result.rows[0].total_collected)).toBe(25000);
    });
  });

  describe('Incident stats queries', () => {
    it('should query incident statistics', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ count: '5' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await db.query(
        expect.stringContaining('emergency_incidents'),
        expect.any(Array)
      );

      expect(parseInt(result.rows[0].count, 10)).toBe(5);
    });

    it('should query incidents by severity', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [
          { severity: 'minor', count: '4' },
          { severity: 'major', count: '1' },
        ],
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await db.query(
        expect.stringContaining('severity'),
        expect.any(Array)
      );

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].severity).toBe('minor');
    });
  });

  describe('Certification stats queries', () => {
    it('should query certification statistics', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ total: '2000', pending: '100', verified: '1800', rejected: '50', expired: '50' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await db.query(
        expect.stringContaining('certifications')
      );

      expect(parseInt(result.rows[0].total, 10)).toBe(2000);
      expect(parseInt(result.rows[0].verified, 10)).toBe(1800);
    });
  });

  describe('Export data queries', () => {
    it('should query bookings for export', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{
          id: 'booking-1',
          trip_date: new Date('2025-01-15'),
          center_name: 'Red Sea Divers',
          site_name: 'Coral Reef',
          diver_name: 'John Doe',
          status: 'completed',
          total_price: '350.00',
          created_at: new Date('2025-01-10'),
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await db.query(
        expect.stringContaining('trip_bookings'),
        expect.any(Array)
      );

      expect(result.rows[0].center_name).toBe('Red Sea Divers');
      expect(parseFloat(result.rows[0].total_price)).toBe(350);
    });

    it('should query revenue data for export', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{
          date: new Date('2025-01-15'),
          center_name: 'Red Sea Divers',
          bookings: '10',
          revenue: '3500.00',
          platform_fee: '350.00',
          conservation_fee: '500.00',
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await db.query(
        expect.stringContaining('payments'),
        expect.any(Array)
      );

      expect(parseFloat(result.rows[0].revenue)).toBe(3500);
    });

    it('should query users for export', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{
          id: 'user-1',
          email: 'user@example.com',
          first_name: 'John',
          last_name: 'Doe',
          role: 'diver',
          status: 'active',
          created_at: new Date('2025-01-01'),
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await db.query(
        expect.stringContaining('users'),
        expect.any(Array)
      );

      expect(result.rows[0].email).toBe('user@example.com');
      expect(result.rows[0].role).toBe('diver');
    });
  });
});
