import { db } from '../../../config/database';
import {
  DateRange,
  TimeGranularity,
  TimeSeriesPoint,
  StatusDistribution,
  CenterBookings,
  SiteBookings,
  TimeSeriesWithComparison,
} from '../analytics.types';

export class BookingsAggregator {
  /**
   * Get booking trend over time
   */
  async getBookingTrend(
    dateRange: DateRange,
    granularity: TimeGranularity = 'day'
  ): Promise<TimeSeriesPoint[]> {
    const truncFormat = this.getDateTruncFormat(granularity);

    const result = await db.query<{ date: Date; value: string }>(
      `SELECT DATE_TRUNC($1, created_at) as date, COUNT(*) as value
       FROM trip_bookings
       WHERE created_at >= $2 AND created_at <= $3
       GROUP BY DATE_TRUNC($1, created_at)
       ORDER BY date ASC`,
      [truncFormat, dateRange.from, dateRange.to]
    );

    return result.rows.map((row) => ({
      date: row.date.toISOString().split('T')[0],
      value: parseInt(row.value, 10),
    }));
  }

  /**
   * Get bookings grouped by status
   */
  async getBookingsByStatus(dateRange: DateRange): Promise<StatusDistribution[]> {
    const result = await db.query<{ status: string; count: string }>(
      `SELECT status, COUNT(*) as count
       FROM trip_bookings
       WHERE created_at >= $1 AND created_at <= $2
       GROUP BY status
       ORDER BY count DESC`,
      [dateRange.from, dateRange.to]
    );

    const total = result.rows.reduce((sum, row) => sum + parseInt(row.count, 10), 0);

    return result.rows.map((row) => ({
      status: row.status,
      count: parseInt(row.count, 10),
      percentage: total > 0 ? (parseInt(row.count, 10) / total) * 100 : 0,
    }));
  }

  /**
   * Get bookings grouped by center
   */
  async getBookingsByCenter(dateRange: DateRange, limit = 10): Promise<CenterBookings[]> {
    const result = await db.query<{
      center_id: string;
      center_name: string;
      bookings: string;
      revenue: string;
    }>(
      `SELECT
        dc.id as center_id,
        dc.name_en as center_name,
        COUNT(tb.id) as bookings,
        COALESCE(SUM(tb.total_price), 0) as revenue
       FROM trip_bookings tb
       JOIN trips t ON tb.trip_id = t.id
       JOIN diving_centers dc ON t.center_id = dc.id
       WHERE tb.created_at >= $1 AND tb.created_at <= $2
       GROUP BY dc.id, dc.name_en
       ORDER BY bookings DESC
       LIMIT $3`,
      [dateRange.from, dateRange.to, limit]
    );

    const total = result.rows.reduce((sum, row) => sum + parseInt(row.bookings, 10), 0);

    return result.rows.map((row) => ({
      centerId: row.center_id,
      centerName: row.center_name,
      bookings: parseInt(row.bookings, 10),
      revenue: parseFloat(row.revenue),
      percentage: total > 0 ? (parseInt(row.bookings, 10) / total) * 100 : 0,
    }));
  }

  /**
   * Get bookings grouped by dive site
   */
  async getBookingsBySite(dateRange: DateRange, limit = 10): Promise<SiteBookings[]> {
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
       WHERE tb.created_at >= $1 AND tb.created_at <= $2
       GROUP BY ds.id, ds.name_en
       ORDER BY bookings DESC
       LIMIT $3`,
      [dateRange.from, dateRange.to, limit]
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
   * Get total bookings in date range
   */
  async getTotalBookings(dateRange: DateRange): Promise<number> {
    const result = await db.query<{ count: string }>(
      'SELECT COUNT(*) FROM trip_bookings WHERE created_at >= $1 AND created_at <= $2',
      [dateRange.from, dateRange.to]
    );
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Get average booking value
   */
  async getAverageBookingValue(dateRange: DateRange): Promise<number> {
    const result = await db.query<{ avg: string }>(
      `SELECT COALESCE(AVG(total_price), 0) as avg
       FROM trip_bookings
       WHERE created_at >= $1 AND created_at <= $2
         AND status IN ('paid', 'completed')`,
      [dateRange.from, dateRange.to]
    );
    return parseFloat(result.rows[0].avg);
  }

  /**
   * Get cancellation rate
   */
  async getCancellationRate(dateRange: DateRange): Promise<number> {
    const result = await db.query<{ total: string; cancelled: string }>(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
       FROM trip_bookings
       WHERE created_at >= $1 AND created_at <= $2`,
      [dateRange.from, dateRange.to]
    );

    const total = parseInt(result.rows[0].total, 10);
    const cancelled = parseInt(result.rows[0].cancelled, 10);

    return total > 0 ? (cancelled / total) * 100 : 0;
  }

  /**
   * Get completed bookings count
   */
  async getCompletedBookings(dateRange: DateRange): Promise<number> {
    const result = await db.query<{ count: string }>(
      `SELECT COUNT(*) FROM trip_bookings
       WHERE created_at >= $1 AND created_at <= $2
         AND status = 'completed'`,
      [dateRange.from, dateRange.to]
    );
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Get cancelled bookings count
   */
  async getCancelledBookings(dateRange: DateRange): Promise<number> {
    const result = await db.query<{ count: string }>(
      `SELECT COUNT(*) FROM trip_bookings
       WHERE created_at >= $1 AND created_at <= $2
         AND status = 'cancelled'`,
      [dateRange.from, dateRange.to]
    );
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Get total revenue from bookings
   */
  async getTotalRevenue(dateRange: DateRange): Promise<number> {
    const result = await db.query<{ sum: string }>(
      `SELECT COALESCE(SUM(total_price), 0) as sum
       FROM trip_bookings
       WHERE created_at >= $1 AND created_at <= $2
         AND status IN ('paid', 'completed')`,
      [dateRange.from, dateRange.to]
    );
    return parseFloat(result.rows[0].sum);
  }

  /**
   * Calculate growth comparison
   */
  async getGrowthComparison(dateRange: DateRange): Promise<TimeSeriesWithComparison> {
    const currentCount = await this.getTotalBookings(dateRange);

    const fromDate = new Date(dateRange.from);
    const toDate = new Date(dateRange.to);
    const periodMs = toDate.getTime() - fromDate.getTime();

    const previousFrom = new Date(fromDate.getTime() - periodMs);
    const previousTo = new Date(fromDate.getTime() - 1);

    const previousCount = await this.getTotalBookings({
      from: previousFrom.toISOString(),
      to: previousTo.toISOString(),
    });

    const change = currentCount - previousCount;
    const changePercent = previousCount > 0 ? (change / previousCount) * 100 : 0;

    return {
      current: currentCount,
      previous: previousCount,
      change,
      changePercent,
    };
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

export const bookingsAggregator = new BookingsAggregator();
