import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before importing the service
vi.mock('../../config/database', () => ({
  db: {
    query: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock('../../config/redis', () => ({
  redis: {
    get: vi.fn(),
    setEx: vi.fn(),
    del: vi.fn(),
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

vi.mock('../../config', () => ({
  config: {
    srsa: {
      useMock: true,
      apiUrl: 'https://api.srsa.gov.sa',
      apiKey: 'test-key',
      apiSecret: 'test-secret',
    },
  },
}));

import { SRSAQuotaService } from '../../integrations/srsa/quota.service';
import { db } from '../../config/database';
import { redis } from '../../config/redis';

describe('SRSAQuotaService', () => {
  let quotaService: SRSAQuotaService;

  beforeEach(() => {
    quotaService = new SRSAQuotaService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkQuota', () => {
    it('should return cached result if available', async () => {
      const cachedResult = {
        siteCode: 'JEDDAH_01',
        date: '2025-01-20',
        dailyLimit: 100,
        used: 30,
        remaining: 70,
        available: true,
      };

      vi.mocked(redis.get).mockResolvedValueOnce(JSON.stringify(cachedResult));

      const result = await quotaService.checkQuota({
        siteCode: 'JEDDAH_01',
        date: '2025-01-20',
        numberOfDivers: 10,
      });

      expect(result.siteCode).toBe('JEDDAH_01');
      expect(result.available).toBe(true);
      expect(redis.get).toHaveBeenCalledWith('quota:JEDDAH_01:2025-01-20');
    });

    it('should generate mock quota when cache miss (mock mode)', async () => {
      vi.mocked(redis.get).mockResolvedValueOnce(null);

      const result = await quotaService.checkQuota({
        siteCode: 'JEDDAH_01',
        date: '2025-01-20',
        numberOfDivers: 5,
      });

      expect(result.siteCode).toBe('JEDDAH_01');
      expect(result.date).toBe('2025-01-20');
      expect(result.dailyLimit).toBe(100);
      expect(typeof result.used).toBe('number');
      expect(typeof result.remaining).toBe('number');
    });
  });

  describe('calculateConservationFee', () => {
    it('should calculate zone_1 fees correctly (50 SAR)', () => {
      const result = quotaService.calculateConservationFee('SITE_001', 'zone_1', 5);

      expect(result.feePerDiver).toBe(50);
      expect(result.totalFee).toBe(250);
      expect(result.currency).toBe('SAR');
    });

    it('should calculate zone_2 fees correctly (35 SAR)', () => {
      const result = quotaService.calculateConservationFee('SITE_002', 'zone_2', 10);

      expect(result.feePerDiver).toBe(35);
      expect(result.totalFee).toBe(350);
    });

    it('should calculate zone_3 fees correctly (20 SAR)', () => {
      const result = quotaService.calculateConservationFee('SITE_003', 'zone_3', 8);

      expect(result.feePerDiver).toBe(20);
      expect(result.totalFee).toBe(160);
    });

    it('should handle unknown zones by defaulting to zone_2 fees', () => {
      // zone_0 is not in the ZONE_FEES map, so it defaults to zone_2
      const result = quotaService.calculateConservationFee('SITE_000', 'zone_0', 20);

      // Defaults to zone_2 (35 SAR) when zone not found
      expect(result.feePerDiver).toBe(35);
      expect(result.totalFee).toBe(700);
    });

    it('should default to zone_2 for unknown zones', () => {
      const result = quotaService.calculateConservationFee('SITE_X', 'unknown_zone', 3);

      expect(result.feePerDiver).toBe(35);
      expect(result.totalFee).toBe(105);
    });
  });

  describe('cancelPermit', () => {
    it('should update database when cancelling permit', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      await quotaService.cancelPermit('SRSA-123456', 'Trip cancelled by customer');

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("permit_status = 'cancelled'"),
        ['SRSA-123456', 'Trip cancelled by customer']
      );
    });
  });

  describe('getQuotaForecast', () => {
    it('should return cached forecast if available', async () => {
      const cachedForecast = [
        { date: '2025-01-20', dailyLimit: 100, reserved: 30, remaining: 70, weatherStatus: 'good' },
        { date: '2025-01-21', dailyLimit: 100, reserved: 50, remaining: 50, weatherStatus: 'good' },
      ];

      vi.mocked(redis.get).mockResolvedValueOnce(JSON.stringify(cachedForecast));

      const result = await quotaService.getQuotaForecast('JEDDAH_01', 7);

      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2025-01-20');
    });

    it('should generate mock forecast when cache miss', async () => {
      vi.mocked(redis.get).mockResolvedValueOnce(null);

      const result = await quotaService.getQuotaForecast('JEDDAH_01', 7);

      expect(result).toHaveLength(7);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('dailyLimit');
      expect(result[0]).toHaveProperty('remaining');
      expect(result[0]).toHaveProperty('weatherStatus');
    });
  });

  describe('getAlternativeSites', () => {
    it('should return mock alternative sites', async () => {
      const result = await quotaService.getAlternativeSites('JEDDAH_01', '2025-01-20', 10);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('siteCode');
      expect(result[0]).toHaveProperty('siteName');
      expect(result[0]).toHaveProperty('remainingQuota');
      expect(result[0]).toHaveProperty('distanceKm');
      expect(result[0]).toHaveProperty('conservationFee');
    });
  });

  describe('getSiteInfo', () => {
    it('should return site info from database', async () => {
      const mockSiteInfo = {
        srsa_site_code: 'JEDDAH_01',
        name_en: 'Jeddah Coral Reef',
        conservation_zone: 'zone_1',
        daily_diver_quota: 100,
        conservation_fee_sar: '50.00',
      };

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [mockSiteInfo],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await quotaService.getSiteInfo('JEDDAH_01');

      expect(result?.siteCode).toBe('JEDDAH_01');
      expect(result?.name).toBe('Jeddah Coral Reef');
      expect(result?.conservationZone).toBe('zone_1');
      expect(result?.feePerDiver).toBe(50);
    });

    it('should return null for non-existent site', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await quotaService.getSiteInfo('NON_EXISTENT');

      expect(result).toBeNull();
    });
  });

  describe('requestPermit (mock mode)', () => {
    it('should return mock permit and store in database', async () => {
      // Mock site ID lookup
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: 'site-uuid-123' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Mock reservation insert
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      const result = await quotaService['mockRequestPermit']({
        siteCode: 'JEDDAH_01',
        date: '2025-01-20',
        numberOfDivers: 10,
        centerId: 'center-123',
        centerPermitNumber: 'CP-001',
        tripId: 'trip-123',
      });

      expect(result.permitNumber).toMatch(/^SRSA-/);
      expect(result.status).toBe('approved');
      expect(result.siteCode).toBe('JEDDAH_01');
      expect(result.numberOfDivers).toBe(10);
    });
  });
});
