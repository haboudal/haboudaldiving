import axios, { AxiosInstance } from 'axios';
import { config } from '../../config';
import { redis } from '../../config/redis';
import { db } from '../../config/database';
import { logger } from '../../utils/logger';
import { ExternalServiceError } from '../../utils/errors';
import { QuotaCheck, QuotaCheckResult, ConservationFee } from '../../types';

interface PermitRequest {
  siteCode: string;
  date: string;
  numberOfDivers: number;
  centerId: string;
  centerPermitNumber: string;
  vesselRegistration?: string;
  tripId?: string;
}

interface PermitResponse {
  permitNumber: string;
  status: 'approved' | 'pending' | 'rejected';
  siteCode: string;
  date: string;
  numberOfDivers: number;
  validFrom: string;
  validUntil: string;
  issuedAt: string;
}

interface QuotaForecast {
  date: string;
  dailyLimit: number;
  reserved: number;
  remaining: number;
  weatherStatus: string;
}

interface AlternativeSite {
  siteCode: string;
  siteName: string;
  remainingQuota: number;
  distanceKm: number;
  conservationFee: number;
}

const ZONE_FEES: Record<string, number> = {
  zone_0: 0,
  zone_1: 50,
  zone_2: 35,
  zone_3: 20,
};

export class SRSAQuotaService {
  private client: AxiosInstance | null = null;
  private useMock: boolean;

  constructor() {
    this.useMock = config.srsa.useMock;

    if (!this.useMock) {
      this.client = axios.create({
        baseURL: config.srsa.apiUrl,
        headers: {
          'Authorization': `Bearer ${config.srsa.apiKey}`,
          'X-API-Secret': config.srsa.apiSecret,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });
    }
  }

  async checkQuota(request: QuotaCheck): Promise<QuotaCheckResult> {
    const cacheKey = `quota:${request.siteCode}:${request.date}`;

    // Check cache first (5 minute TTL)
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      logger.warn('Redis cache check failed', { error: e });
    }

    if (this.useMock) {
      return this.mockCheckQuota(request);
    }

    try {
      const response = await this.client!.post('/v1/quota/check', request);
      const result = response.data as QuotaCheckResult;

      // Cache result
      try {
        await redis.setEx(cacheKey, 300, JSON.stringify(result));
      } catch (e) {
        logger.warn('Redis cache set failed', { error: e });
      }

      return result;
    } catch (error) {
      logger.error('SRSA quota check failed', { error, request });
      throw new ExternalServiceError('SRSA', 'Failed to check quota availability');
    }
  }

  async requestPermit(request: PermitRequest): Promise<PermitResponse> {
    if (this.useMock) {
      return this.mockRequestPermit(request);
    }

    try {
      const response = await this.client!.post('/v1/permits/request', request);

      // Invalidate quota cache
      try {
        await redis.del(`quota:${request.siteCode}:${request.date}`);
      } catch (e) {
        logger.warn('Redis cache invalidation failed', { error: e });
      }

      // Store reservation in database
      await this.storeReservation(request, response.data);

      return response.data as PermitResponse;
    } catch (error) {
      logger.error('SRSA permit request failed', { error, request });
      throw new ExternalServiceError('SRSA', 'Failed to request permit');
    }
  }

  async cancelPermit(permitNumber: string, reason: string): Promise<void> {
    // Update database
    await db.query(
      `UPDATE srsa_quota_reservations
       SET permit_status = 'cancelled', cancelled_at = NOW(), cancellation_reason = $2
       WHERE permit_number = $1`,
      [permitNumber, reason]
    );

    if (this.useMock) {
      logger.info('Mock: Permit cancelled', { permitNumber, reason });
      return;
    }

    try {
      await this.client!.delete(`/v1/permits/${permitNumber}`, {
        data: { reason },
      });
    } catch (error) {
      logger.error('SRSA permit cancellation failed', { error, permitNumber });
      throw new ExternalServiceError('SRSA', 'Failed to cancel permit');
    }
  }

  calculateConservationFee(
    siteCode: string,
    conservationZone: string,
    numberOfDivers: number
  ): ConservationFee {
    const feePerDiver = ZONE_FEES[conservationZone] || ZONE_FEES.zone_2;
    const totalFee = feePerDiver * numberOfDivers;

    return {
      siteCode,
      conservationZone,
      numberOfDivers,
      feePerDiver,
      totalFee,
      currency: 'SAR',
    };
  }

  async getAlternativeSites(
    siteCode: string,
    date: string,
    numberOfDivers: number
  ): Promise<AlternativeSite[]> {
    if (this.useMock) {
      return this.mockGetAlternatives(siteCode);
    }

    try {
      const response = await this.client!.get('/v1/sites/alternatives', {
        params: { siteCode, date, divers: numberOfDivers },
      });
      return response.data.alternatives;
    } catch (error) {
      logger.error('SRSA alternatives lookup failed', { error });
      return [];
    }
  }

  async getQuotaForecast(siteCode: string, days: number = 7): Promise<QuotaForecast[]> {
    const cacheKey = `forecast:${siteCode}:${days}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      logger.warn('Redis cache check failed', { error: e });
    }

    if (this.useMock) {
      return this.mockGetForecast(siteCode, days);
    }

    try {
      const response = await this.client!.get(`/v1/sites/${siteCode}/forecast`, {
        params: { days },
      });

      try {
        await redis.setEx(cacheKey, 3600, JSON.stringify(response.data));
      } catch (e) {
        logger.warn('Redis cache set failed', { error: e });
      }

      return response.data;
    } catch (error) {
      logger.error('SRSA forecast lookup failed', { error });
      throw new ExternalServiceError('SRSA', 'Failed to get quota forecast');
    }
  }

  async getSiteInfo(siteCode: string): Promise<{
    siteCode: string;
    name: string;
    conservationZone: string;
    dailyQuota: number;
    feePerDiver: number;
  } | null> {
    const result = await db.query(
      `SELECT srsa_site_code, name_en, conservation_zone, daily_diver_quota, conservation_fee_sar
       FROM dive_sites WHERE srsa_site_code = $1`,
      [siteCode]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      siteCode: row.srsa_site_code,
      name: row.name_en,
      conservationZone: row.conservation_zone,
      dailyQuota: row.daily_diver_quota,
      feePerDiver: parseFloat(row.conservation_fee_sar),
    };
  }

  private async storeReservation(request: PermitRequest, response: PermitResponse): Promise<void> {
    // Get site ID
    const siteResult = await db.query<{ id: string }>(
      'SELECT id FROM dive_sites WHERE srsa_site_code = $1',
      [request.siteCode]
    );

    const siteId = siteResult.rows[0]?.id;

    await db.query(
      `INSERT INTO srsa_quota_reservations (
        site_id, srsa_site_code, trip_id, center_id, reservation_date,
        number_of_divers, permit_number, permit_status, center_permit_number,
        vessel_registration, confirmed_at, srsa_response_payload
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11)`,
      [
        siteId,
        request.siteCode,
        request.tripId,
        request.centerId,
        request.date,
        request.numberOfDivers,
        response.permitNumber,
        response.status,
        request.centerPermitNumber,
        request.vesselRegistration,
        JSON.stringify(response),
      ]
    );
  }

  // Mock implementations for development
  private mockCheckQuota(request: QuotaCheck): QuotaCheckResult {
    const dailyLimit = 100;
    const used = Math.floor(Math.random() * 60);
    const remaining = dailyLimit - used;
    const available = remaining >= request.numberOfDivers;

    return {
      siteCode: request.siteCode,
      date: request.date,
      dailyLimit,
      used,
      remaining,
      available,
      nextAvailableSlot: available ? undefined : this.getNextDate(request.date),
    };
  }

  private mockRequestPermit(request: PermitRequest): PermitResponse {
    const permitNumber = `SRSA-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Store in database even for mock
    this.storeReservation(request, {
      permitNumber,
      status: 'approved',
      siteCode: request.siteCode,
      date: request.date,
      numberOfDivers: request.numberOfDivers,
      validFrom: request.date,
      validUntil: request.date,
      issuedAt: new Date().toISOString(),
    }).catch((e) => logger.error('Failed to store mock reservation', { error: e }));

    return {
      permitNumber,
      status: 'approved',
      siteCode: request.siteCode,
      date: request.date,
      numberOfDivers: request.numberOfDivers,
      validFrom: request.date,
      validUntil: request.date,
      issuedAt: new Date().toISOString(),
    };
  }

  private mockGetAlternatives(siteCode: string): AlternativeSite[] {
    return [
      {
        siteCode: 'JEDDAH_02',
        siteName: 'Sheraton Beach Reef',
        remainingQuota: 45,
        distanceKm: 5.2,
        conservationFee: 35,
      },
      {
        siteCode: 'YANBU_01',
        siteName: 'Seven Sisters',
        remainingQuota: 30,
        distanceKm: 120,
        conservationFee: 50,
      },
    ];
  }

  private mockGetForecast(siteCode: string, days: number): QuotaForecast[] {
    const forecast: QuotaForecast[] = [];
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);

      forecast.push({
        date: date.toISOString().split('T')[0],
        dailyLimit: 100,
        reserved: Math.floor(Math.random() * 50),
        remaining: Math.floor(50 + Math.random() * 50),
        weatherStatus: Math.random() > 0.2 ? 'good' : 'moderate',
      });
    }

    return forecast;
  }

  private getNextDate(fromDate: string): string {
    const date = new Date(fromDate);
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  }
}

export const srsaQuotaService = new SRSAQuotaService();
