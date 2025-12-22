import { db } from '../../../config/database';
import {
  DateRange,
  TimeGranularity,
  TimeSeriesPoint,
  RevenueBreakdown,
  CenterRevenue,
  PaymentMethodRevenue,
  RefundStats,
  TimeSeriesWithComparison,
} from '../analytics.types';

export class RevenueAggregator {
  /**
   * Get total revenue in date range
   */
  async getTotalRevenue(dateRange: DateRange): Promise<number> {
    const result = await db.query<{ sum: string }>(
      `SELECT COALESCE(SUM(amount), 0) as sum
       FROM payments
       WHERE created_at >= $1 AND created_at <= $2
         AND status = 'completed'`,
      [dateRange.from, dateRange.to]
    );
    return parseFloat(result.rows[0].sum);
  }

  /**
   * Get revenue breakdown by fee type
   */
  async getRevenueBreakdown(dateRange: DateRange): Promise<RevenueBreakdown> {
    const result = await db.query<{
      base_fees: string;
      equipment_fees: string;
      conservation_fees: string;
      insurance_fees: string;
      platform_fees: string;
      vat_collected: string;
      discounts: string;
    }>(
      `SELECT
        COALESCE(SUM(tb.base_price), 0) as base_fees,
        COALESCE(SUM(tb.equipment_fees), 0) as equipment_fees,
        COALESCE(SUM(tb.conservation_fee), 0) as conservation_fees,
        COALESCE(SUM(tb.insurance_fee), 0) as insurance_fees,
        COALESCE(SUM(tb.platform_fee), 0) as platform_fees,
        COALESCE(SUM(tb.vat_amount), 0) as vat_collected,
        COALESCE(SUM(COALESCE(tb.discount_amount, 0)), 0) as discounts
       FROM trip_bookings tb
       JOIN payments p ON p.booking_id = tb.id
       WHERE p.created_at >= $1 AND p.created_at <= $2
         AND p.status = 'completed'`,
      [dateRange.from, dateRange.to]
    );

    return {
      baseFees: parseFloat(result.rows[0].base_fees),
      equipmentFees: parseFloat(result.rows[0].equipment_fees),
      conservationFees: parseFloat(result.rows[0].conservation_fees),
      insuranceFees: parseFloat(result.rows[0].insurance_fees),
      platformFees: parseFloat(result.rows[0].platform_fees),
      vatCollected: parseFloat(result.rows[0].vat_collected),
      discounts: parseFloat(result.rows[0].discounts),
    };
  }

  /**
   * Get revenue grouped by center
   */
  async getRevenueByCenter(dateRange: DateRange, limit = 10): Promise<CenterRevenue[]> {
    const result = await db.query<{
      center_id: string;
      center_name: string;
      revenue: string;
      bookings: string;
      platform_fee: string;
    }>(
      `SELECT
        dc.id as center_id,
        dc.name_en as center_name,
        COALESCE(SUM(p.amount), 0) as revenue,
        COUNT(DISTINCT tb.id) as bookings,
        COALESCE(SUM(tb.platform_fee), 0) as platform_fee
       FROM payments p
       JOIN trip_bookings tb ON p.booking_id = tb.id
       JOIN trips t ON tb.trip_id = t.id
       JOIN diving_centers dc ON t.center_id = dc.id
       WHERE p.created_at >= $1 AND p.created_at <= $2
         AND p.status = 'completed'
       GROUP BY dc.id, dc.name_en
       ORDER BY revenue DESC
       LIMIT $3`,
      [dateRange.from, dateRange.to, limit]
    );

    const total = result.rows.reduce((sum, row) => sum + parseFloat(row.revenue), 0);

    return result.rows.map((row) => ({
      centerId: row.center_id,
      centerName: row.center_name,
      revenue: parseFloat(row.revenue),
      bookings: parseInt(row.bookings, 10),
      platformFee: parseFloat(row.platform_fee),
      percentage: total > 0 ? (parseFloat(row.revenue) / total) * 100 : 0,
    }));
  }

  /**
   * Get revenue grouped by payment method
   */
  async getRevenueByPaymentMethod(dateRange: DateRange): Promise<PaymentMethodRevenue[]> {
    const result = await db.query<{
      method: string;
      count: string;
      amount: string;
    }>(
      `SELECT
        payment_method as method,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as amount
       FROM payments
       WHERE created_at >= $1 AND created_at <= $2
         AND status = 'completed'
       GROUP BY payment_method
       ORDER BY amount DESC`,
      [dateRange.from, dateRange.to]
    );

    const total = result.rows.reduce((sum, row) => sum + parseFloat(row.amount), 0);

    return result.rows.map((row) => ({
      method: row.method,
      count: parseInt(row.count, 10),
      amount: parseFloat(row.amount),
      percentage: total > 0 ? (parseFloat(row.amount) / total) * 100 : 0,
    }));
  }

  /**
   * Get revenue trend over time
   */
  async getRevenueTrend(
    dateRange: DateRange,
    granularity: TimeGranularity = 'day'
  ): Promise<TimeSeriesPoint[]> {
    const truncFormat = this.getDateTruncFormat(granularity);

    const result = await db.query<{ date: Date; value: string }>(
      `SELECT DATE_TRUNC($1, created_at) as date, COALESCE(SUM(amount), 0) as value
       FROM payments
       WHERE created_at >= $2 AND created_at <= $3
         AND status = 'completed'
       GROUP BY DATE_TRUNC($1, created_at)
       ORDER BY date ASC`,
      [truncFormat, dateRange.from, dateRange.to]
    );

    return result.rows.map((row) => ({
      date: row.date.toISOString().split('T')[0],
      value: parseFloat(row.value),
    }));
  }

  /**
   * Get refund statistics
   */
  async getRefundStats(dateRange: DateRange): Promise<RefundStats> {
    const result = await db.query<{
      count: string;
      total: string;
      total_revenue: string;
    }>(
      `SELECT
        (SELECT COUNT(*) FROM payments
         WHERE created_at >= $1 AND created_at <= $2
         AND status = 'refunded') as count,
        (SELECT COALESCE(SUM(amount), 0) FROM payments
         WHERE created_at >= $1 AND created_at <= $2
         AND status = 'refunded') as total,
        (SELECT COALESCE(SUM(amount), 0) FROM payments
         WHERE created_at >= $1 AND created_at <= $2
         AND status IN ('completed', 'refunded')) as total_revenue`,
      [dateRange.from, dateRange.to]
    );

    const count = parseInt(result.rows[0].count, 10);
    const total = parseFloat(result.rows[0].total);
    const totalRevenue = parseFloat(result.rows[0].total_revenue);

    return {
      count,
      total,
      rate: totalRevenue > 0 ? (total / totalRevenue) * 100 : 0,
    };
  }

  /**
   * Get platform fees collected
   */
  async getPlatformFees(dateRange: DateRange): Promise<number> {
    const result = await db.query<{ sum: string }>(
      `SELECT COALESCE(SUM(tb.platform_fee), 0) as sum
       FROM trip_bookings tb
       JOIN payments p ON p.booking_id = tb.id
       WHERE p.created_at >= $1 AND p.created_at <= $2
         AND p.status = 'completed'`,
      [dateRange.from, dateRange.to]
    );
    return parseFloat(result.rows[0].sum);
  }

  /**
   * Get conservation fees collected
   */
  async getConservationFees(dateRange: DateRange): Promise<number> {
    const result = await db.query<{ sum: string }>(
      `SELECT COALESCE(SUM(amount), 0) as sum
       FROM conservation_fee_transactions
       WHERE created_at >= $1 AND created_at <= $2
         AND status = 'completed'`,
      [dateRange.from, dateRange.to]
    );
    return parseFloat(result.rows[0].sum);
  }

  /**
   * Calculate growth comparison
   */
  async getGrowthComparison(dateRange: DateRange): Promise<TimeSeriesWithComparison> {
    const currentRevenue = await this.getTotalRevenue(dateRange);

    const fromDate = new Date(dateRange.from);
    const toDate = new Date(dateRange.to);
    const periodMs = toDate.getTime() - fromDate.getTime();

    const previousFrom = new Date(fromDate.getTime() - periodMs);
    const previousTo = new Date(fromDate.getTime() - 1);

    const previousRevenue = await this.getTotalRevenue({
      from: previousFrom.toISOString(),
      to: previousTo.toISOString(),
    });

    const change = currentRevenue - previousRevenue;
    const changePercent = previousRevenue > 0 ? (change / previousRevenue) * 100 : 0;

    return {
      current: currentRevenue,
      previous: previousRevenue,
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

export const revenueAggregator = new RevenueAggregator();
