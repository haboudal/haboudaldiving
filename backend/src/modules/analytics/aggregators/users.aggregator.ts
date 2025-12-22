import { db } from '../../../config/database';
import {
  DateRange,
  TimeGranularity,
  TimeSeriesPoint,
  RoleDistribution,
  StatusDistribution,
  RegionData,
  TimeSeriesWithComparison,
} from '../analytics.types';

export class UsersAggregator {
  /**
   * Get user registration trend over time
   */
  async getRegistrationTrend(
    dateRange: DateRange,
    granularity: TimeGranularity = 'day'
  ): Promise<TimeSeriesPoint[]> {
    const truncFormat = this.getDateTruncFormat(granularity);

    const result = await db.query<{ date: Date; value: string }>(
      `SELECT DATE_TRUNC($1, created_at) as date, COUNT(*) as value
       FROM users
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
   * Get active users for different periods
   */
  async getActiveUsers(): Promise<{ daily: number; weekly: number; monthly: number }> {
    const result = await db.query<{ daily: string; weekly: string; monthly: string }>(`
      SELECT
        COUNT(*) FILTER (WHERE last_login_at > NOW() - INTERVAL '1 day') as daily,
        COUNT(*) FILTER (WHERE last_login_at > NOW() - INTERVAL '7 days') as weekly,
        COUNT(*) FILTER (WHERE last_login_at > NOW() - INTERVAL '30 days') as monthly
      FROM users
      WHERE status = 'active'
    `);

    return {
      daily: parseInt(result.rows[0].daily, 10),
      weekly: parseInt(result.rows[0].weekly, 10),
      monthly: parseInt(result.rows[0].monthly, 10),
    };
  }

  /**
   * Get users grouped by role
   */
  async getUsersByRole(): Promise<RoleDistribution[]> {
    const result = await db.query<{ role: string; count: string }>(`
      SELECT role, COUNT(*) as count
      FROM users
      GROUP BY role
      ORDER BY count DESC
    `);

    const total = result.rows.reduce((sum, row) => sum + parseInt(row.count, 10), 0);

    return result.rows.map((row) => ({
      role: row.role,
      count: parseInt(row.count, 10),
      percentage: total > 0 ? (parseInt(row.count, 10) / total) * 100 : 0,
    }));
  }

  /**
   * Get users grouped by status
   */
  async getUsersByStatus(): Promise<StatusDistribution[]> {
    const result = await db.query<{ status: string; count: string }>(`
      SELECT status, COUNT(*) as count
      FROM users
      GROUP BY status
      ORDER BY count DESC
    `);

    const total = result.rows.reduce((sum, row) => sum + parseInt(row.count, 10), 0);

    return result.rows.map((row) => ({
      status: row.status,
      count: parseInt(row.count, 10),
      percentage: total > 0 ? (parseInt(row.count, 10) / total) * 100 : 0,
    }));
  }

  /**
   * Get top regions by user count
   */
  async getTopRegions(limit = 10): Promise<RegionData[]> {
    const result = await db.query<{ region_id: string; region_name: string; count: string }>(`
      SELECT
        r.id as region_id,
        r.name_en as region_name,
        COUNT(dp.id) as count
      FROM diver_profiles dp
      JOIN users u ON u.id = dp.user_id
      LEFT JOIN regions r ON dp.nationality = r.name_en
      WHERE u.status = 'active'
      GROUP BY r.id, r.name_en
      ORDER BY count DESC
      LIMIT $1
    `, [limit]);

    const total = result.rows.reduce((sum, row) => sum + parseInt(row.count, 10), 0);

    return result.rows.map((row) => ({
      regionId: row.region_id || 'unknown',
      regionName: row.region_name || 'Unknown',
      count: parseInt(row.count, 10),
      percentage: total > 0 ? (parseInt(row.count, 10) / total) * 100 : 0,
    }));
  }

  /**
   * Get total user count
   */
  async getTotalUsers(): Promise<number> {
    const result = await db.query<{ count: string }>('SELECT COUNT(*) FROM users');
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Get new users in date range
   */
  async getNewUsers(dateRange: DateRange): Promise<number> {
    const result = await db.query<{ count: string }>(
      'SELECT COUNT(*) FROM users WHERE created_at >= $1 AND created_at <= $2',
      [dateRange.from, dateRange.to]
    );
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Calculate growth comparison
   */
  async getGrowthComparison(dateRange: DateRange): Promise<TimeSeriesWithComparison> {
    const currentCount = await this.getNewUsers(dateRange);

    // Calculate previous period
    const fromDate = new Date(dateRange.from);
    const toDate = new Date(dateRange.to);
    const periodMs = toDate.getTime() - fromDate.getTime();

    const previousFrom = new Date(fromDate.getTime() - periodMs);
    const previousTo = new Date(fromDate.getTime() - 1);

    const previousCount = await this.getNewUsers({
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

  /**
   * Get date truncation format for PostgreSQL
   */
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

export const usersAggregator = new UsersAggregator();
