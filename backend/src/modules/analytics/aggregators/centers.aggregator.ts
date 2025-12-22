import { db } from '../../../config/database';
import {
  DateRange,
  TimeGranularity,
  TimeSeriesPoint,
  CenterMetrics,
  CenterTripStats,
  CenterBookingStats,
  CenterRating,
  CenterRanking,
  SiteBookings,
} from '../analytics.types';

export class CentersAggregator {
  /**
   * Get comprehensive metrics for a specific center
   */
  async getCenterMetrics(centerId: string, dateRange: DateRange): Promise<CenterMetrics> {
    const [centerInfo, trips, bookings, rating, topSites, trend] = await Promise.all([
      this.getCenterInfo(centerId),
      this.getCenterTripStats(centerId, dateRange),
      this.getCenterBookingStats(centerId, dateRange),
      this.getCenterRating(centerId),
      this.getCenterTopSites(centerId, dateRange, 5),
      this.getCenterBookingTrend(centerId, dateRange, 'day'),
    ]);

    return {
      centerId,
      centerName: centerInfo.name,
      period: dateRange,
      trips,
      bookings,
      rating,
      topSites,
      trend,
    };
  }

  /**
   * Get center basic info
   */
  private async getCenterInfo(centerId: string): Promise<{ name: string }> {
    const result = await db.query<{ name_en: string }>(
      'SELECT name_en FROM diving_centers WHERE id = $1',
      [centerId]
    );
    return { name: result.rows[0]?.name_en || 'Unknown' };
  }

  /**
   * Get center trip statistics
   */
  async getCenterTripStats(centerId: string, dateRange: DateRange): Promise<CenterTripStats> {
    const result = await db.query<{
      total: string;
      completed: string;
      cancelled: string;
      total_capacity: string;
      total_booked: string;
    }>(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        COALESCE(SUM(max_participants), 0) as total_capacity,
        COALESCE(SUM(current_participants), 0) as total_booked
       FROM trips
       WHERE center_id = $1
         AND date >= $2 AND date <= $3`,
      [centerId, dateRange.from, dateRange.to]
    );

    const totalCapacity = parseInt(result.rows[0].total_capacity, 10);
    const totalBooked = parseInt(result.rows[0].total_booked, 10);

    return {
      total: parseInt(result.rows[0].total, 10),
      completed: parseInt(result.rows[0].completed, 10),
      cancelled: parseInt(result.rows[0].cancelled, 10),
      avgFillRate: totalCapacity > 0 ? (totalBooked / totalCapacity) * 100 : 0,
    };
  }

  /**
   * Get center booking statistics
   */
  async getCenterBookingStats(centerId: string, dateRange: DateRange): Promise<CenterBookingStats> {
    const result = await db.query<{
      total: string;
      revenue: string;
    }>(
      `SELECT
        COUNT(*) as total,
        COALESCE(SUM(tb.total_price), 0) as revenue
       FROM trip_bookings tb
       JOIN trips t ON tb.trip_id = t.id
       WHERE t.center_id = $1
         AND tb.created_at >= $2 AND tb.created_at <= $3
         AND tb.status IN ('paid', 'completed')`,
      [centerId, dateRange.from, dateRange.to]
    );

    const total = parseInt(result.rows[0].total, 10);
    const revenue = parseFloat(result.rows[0].revenue);

    return {
      total,
      revenue,
      avgValue: total > 0 ? revenue / total : 0,
    };
  }

  /**
   * Get center rating statistics
   */
  async getCenterRating(centerId: string): Promise<CenterRating> {
    const result = await db.query<{
      average: string;
      count: string;
    }>(
      `SELECT
        COALESCE(AVG(rating), 0) as average,
        COUNT(*) as count
       FROM reviews
       WHERE center_id = $1 AND status = 'approved'`,
      [centerId]
    );

    const distributionResult = await db.query<{ stars: number; count: string }>(
      `SELECT rating as stars, COUNT(*) as count
       FROM reviews
       WHERE center_id = $1 AND status = 'approved'
       GROUP BY rating
       ORDER BY rating DESC`,
      [centerId]
    );

    return {
      average: parseFloat(result.rows[0].average),
      count: parseInt(result.rows[0].count, 10),
      distribution: distributionResult.rows.map((row) => ({
        stars: row.stars,
        count: parseInt(row.count, 10),
      })),
    };
  }

  /**
   * Get top sites for a center
   */
  async getCenterTopSites(
    centerId: string,
    dateRange: DateRange,
    limit = 5
  ): Promise<SiteBookings[]> {
    const result = await db.query<{
      site_id: string;
      site_name: string;
      bookings: string;
    }>(
      `SELECT
        ds.id as site_id,
        ds.name_en as site_name,
        COUNT(tb.id) as bookings
       FROM trip_bookings tb
       JOIN trips t ON tb.trip_id = t.id
       JOIN dive_sites ds ON t.site_id = ds.id
       WHERE t.center_id = $1
         AND tb.created_at >= $2 AND tb.created_at <= $3
       GROUP BY ds.id, ds.name_en
       ORDER BY bookings DESC
       LIMIT $4`,
      [centerId, dateRange.from, dateRange.to, limit]
    );

    const total = result.rows.reduce((sum, row) => sum + parseInt(row.bookings, 10), 0);

    return result.rows.map((row) => ({
      siteId: row.site_id,
      siteName: row.site_name,
      bookings: parseInt(row.bookings, 10),
      percentage: total > 0 ? (parseInt(row.bookings, 10) / total) * 100 : 0,
    }));
  }

  /**
   * Get center booking trend
   */
  async getCenterBookingTrend(
    centerId: string,
    dateRange: DateRange,
    granularity: TimeGranularity = 'day'
  ): Promise<TimeSeriesPoint[]> {
    const truncFormat = this.getDateTruncFormat(granularity);

    const result = await db.query<{ date: Date; value: string }>(
      `SELECT DATE_TRUNC($1, tb.created_at) as date, COUNT(*) as value
       FROM trip_bookings tb
       JOIN trips t ON tb.trip_id = t.id
       WHERE t.center_id = $2
         AND tb.created_at >= $3 AND tb.created_at <= $4
       GROUP BY DATE_TRUNC($1, tb.created_at)
       ORDER BY date ASC`,
      [truncFormat, centerId, dateRange.from, dateRange.to]
    );

    return result.rows.map((row) => ({
      date: row.date.toISOString().split('T')[0],
      value: parseInt(row.value, 10),
    }));
  }

  /**
   * Get center rankings by metric
   */
  async getCenterRanking(
    metric: 'revenue' | 'bookings' | 'rating' | 'trips',
    dateRange: DateRange,
    limit = 10
  ): Promise<CenterRanking[]> {
    let query: string;

    switch (metric) {
      case 'revenue':
        query = `
          SELECT
            dc.id as center_id,
            dc.name_en as center_name,
            COALESCE(SUM(tb.total_price), 0) as value
          FROM diving_centers dc
          LEFT JOIN trips t ON t.center_id = dc.id
          LEFT JOIN trip_bookings tb ON tb.trip_id = t.id
            AND tb.created_at >= $1 AND tb.created_at <= $2
            AND tb.status IN ('paid', 'completed')
          WHERE dc.status = 'active'
          GROUP BY dc.id, dc.name_en
          ORDER BY value DESC
          LIMIT $3
        `;
        break;

      case 'bookings':
        query = `
          SELECT
            dc.id as center_id,
            dc.name_en as center_name,
            COUNT(tb.id) as value
          FROM diving_centers dc
          LEFT JOIN trips t ON t.center_id = dc.id
          LEFT JOIN trip_bookings tb ON tb.trip_id = t.id
            AND tb.created_at >= $1 AND tb.created_at <= $2
          WHERE dc.status = 'active'
          GROUP BY dc.id, dc.name_en
          ORDER BY value DESC
          LIMIT $3
        `;
        break;

      case 'rating':
        query = `
          SELECT
            dc.id as center_id,
            dc.name_en as center_name,
            COALESCE(AVG(r.rating), 0) as value
          FROM diving_centers dc
          LEFT JOIN reviews r ON r.center_id = dc.id AND r.status = 'approved'
          WHERE dc.status = 'active'
          GROUP BY dc.id, dc.name_en
          ORDER BY value DESC
          LIMIT $3
        `;
        break;

      case 'trips':
        query = `
          SELECT
            dc.id as center_id,
            dc.name_en as center_name,
            COUNT(t.id) as value
          FROM diving_centers dc
          LEFT JOIN trips t ON t.center_id = dc.id
            AND t.date >= $1 AND t.date <= $2
          WHERE dc.status = 'active'
          GROUP BY dc.id, dc.name_en
          ORDER BY value DESC
          LIMIT $3
        `;
        break;
    }

    const result = await db.query<{
      center_id: string;
      center_name: string;
      value: string;
    }>(query, [dateRange.from, dateRange.to, limit]);

    return result.rows.map((row, index) => ({
      centerId: row.center_id,
      centerName: row.center_name,
      metric,
      value: parseFloat(row.value),
      rank: index + 1,
    }));
  }

  /**
   * Compare multiple centers
   */
  async compareCenters(
    centerIds: string[],
    dateRange: DateRange
  ): Promise<CenterMetrics[]> {
    const metrics = await Promise.all(
      centerIds.map((id) => this.getCenterMetrics(id, dateRange))
    );
    return metrics;
  }

  /**
   * Get top performing centers
   */
  async getTopPerformingCenters(
    dateRange: DateRange,
    limit = 10
  ): Promise<CenterRanking[]> {
    return this.getCenterRanking('revenue', dateRange, limit);
  }

  private getDateTruncFormat(granularity: TimeGranularity): string {
    const formats: Record<TimeGranularity, string> = {
      day: 'day',
      week: 'week',
      month: 'month',
      quarter: 'quarter',
      year: 'year',
    };
    return formats[granularity];
  }
}

export const centersAggregator = new CentersAggregator();
