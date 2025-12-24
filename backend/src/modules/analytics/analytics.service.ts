import { db } from '../../config/database';
import { usersAggregator } from './aggregators/users.aggregator';
import { bookingsAggregator } from './aggregators/bookings.aggregator';
import { revenueAggregator } from './aggregators/revenue.aggregator';
import { centersAggregator } from './aggregators/centers.aggregator';
import { csvExporter } from './exporters/csv.exporter';
import {
  DateRange,
  TimeGranularity,
  PlatformOverview,
  UserMetrics,
  BookingMetrics,
  RevenueMetrics,
  CenterMetrics,
  CenterRanking,
  ComplianceMetrics,
  SiteQuotaData,
  ZoneFeeData,
  IncidentStats,
  CertificationStats,
  ReportType,
  ReportData,
  ExportFormat,
  ExportResult,
  ExportColumn,
} from './analytics.types';

class AnalyticsService {
  /**
   * Get default date range (last 30 days)
   */
  private getDefaultDateRange(): DateRange {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    return {
      from: from.toISOString(),
      to: to.toISOString(),
    };
  }

  /**
   * Get platform overview dashboard
   */
  async getOverview(
    dateRange?: Partial<DateRange>,
    compare = false
  ): Promise<PlatformOverview> {
    const range = {
      ...this.getDefaultDateRange(),
      ...dateRange,
    };

    const [
      totalUsers,
      newUsers,
      activeUsers,
      usersByRole,
      totalBookings,
      completedBookings,
      cancelledBookings,
      bookingRevenue,
      totalTrips,
      activeTrips,
      avgFillRate,
      paymentStats,
    ] = await Promise.all([
      usersAggregator.getTotalUsers(),
      usersAggregator.getNewUsers(range),
      usersAggregator.getActiveUsers(),
      usersAggregator.getUsersByRole(),
      bookingsAggregator.getTotalBookings(range),
      bookingsAggregator.getCompletedBookings(range),
      bookingsAggregator.getCancelledBookings(range),
      bookingsAggregator.getTotalRevenue(range),
      this.getTotalTrips(range),
      this.getActiveTrips(),
      this.getAverageFillRate(range),
      this.getPaymentStats(range),
    ]);

    const overview: PlatformOverview = {
      period: range,
      users: {
        total: totalUsers,
        new: newUsers,
        active: activeUsers.monthly,
        byRole: usersByRole,
      },
      bookings: {
        total: totalBookings,
        completed: completedBookings,
        cancelled: cancelledBookings,
        revenue: bookingRevenue,
      },
      trips: {
        total: totalTrips,
        active: activeTrips,
        avgFillRate,
      },
      payments: paymentStats,
    };

    if (compare) {
      const [usersComparison, bookingsComparison, revenueComparison] = await Promise.all([
        usersAggregator.getGrowthComparison(range),
        bookingsAggregator.getGrowthComparison(range),
        revenueAggregator.getGrowthComparison(range),
      ]);

      overview.comparison = {
        users: usersComparison,
        bookings: bookingsComparison,
        revenue: revenueComparison,
      };
    }

    return overview;
  }

  /**
   * Get user metrics
   */
  async getUserMetrics(
    dateRange?: Partial<DateRange>,
    granularity: TimeGranularity = 'day'
  ): Promise<UserMetrics> {
    const range = {
      ...this.getDefaultDateRange(),
      ...dateRange,
    };

    const [
      total,
      registrations,
      activeUsers,
      byRole,
      byStatus,
      topRegions,
      growth,
    ] = await Promise.all([
      usersAggregator.getTotalUsers(),
      usersAggregator.getRegistrationTrend(range, granularity),
      usersAggregator.getActiveUsers(),
      usersAggregator.getUsersByRole(),
      usersAggregator.getUsersByStatus(),
      usersAggregator.getTopRegions(10),
      usersAggregator.getGrowthComparison(range),
    ]);

    return {
      period: range,
      total,
      registrations,
      activeUsers,
      byRole,
      byStatus,
      topRegions,
      growth,
    };
  }

  /**
   * Get booking metrics
   */
  async getBookingMetrics(
    dateRange?: Partial<DateRange>,
    granularity: TimeGranularity = 'day'
  ): Promise<BookingMetrics> {
    const range = {
      ...this.getDefaultDateRange(),
      ...dateRange,
    };

    const [
      total,
      byStatus,
      byCenter,
      bySite,
      trend,
      averageValue,
      cancellationRate,
      growth,
    ] = await Promise.all([
      bookingsAggregator.getTotalBookings(range),
      bookingsAggregator.getBookingsByStatus(range),
      bookingsAggregator.getBookingsByCenter(range, 10),
      bookingsAggregator.getBookingsBySite(range, 10),
      bookingsAggregator.getBookingTrend(range, granularity),
      bookingsAggregator.getAverageBookingValue(range),
      bookingsAggregator.getCancellationRate(range),
      bookingsAggregator.getGrowthComparison(range),
    ]);

    return {
      period: range,
      total,
      byStatus,
      byCenter,
      bySite,
      trend,
      averageValue,
      cancellationRate,
      growth,
    };
  }

  /**
   * Get revenue metrics
   */
  async getRevenueMetrics(
    dateRange?: Partial<DateRange>,
    granularity: TimeGranularity = 'day'
  ): Promise<RevenueMetrics> {
    const range = {
      ...this.getDefaultDateRange(),
      ...dateRange,
    };

    const [
      total,
      breakdown,
      byCenter,
      byPaymentMethod,
      trend,
      refunds,
      growth,
    ] = await Promise.all([
      revenueAggregator.getTotalRevenue(range),
      revenueAggregator.getRevenueBreakdown(range),
      revenueAggregator.getRevenueByCenter(range, 10),
      revenueAggregator.getRevenueByPaymentMethod(range),
      revenueAggregator.getRevenueTrend(range, granularity),
      revenueAggregator.getRefundStats(range),
      revenueAggregator.getGrowthComparison(range),
    ]);

    return {
      period: range,
      total,
      breakdown,
      byCenter,
      byPaymentMethod,
      trend,
      refunds,
      growth,
    };
  }

  /**
   * Get center metrics
   */
  async getCenterMetrics(
    centerId: string,
    dateRange?: Partial<DateRange>
  ): Promise<CenterMetrics> {
    const range = {
      ...this.getDefaultDateRange(),
      ...dateRange,
    };

    return centersAggregator.getCenterMetrics(centerId, range);
  }

  /**
   * Get center rankings
   */
  async getCenterRankings(
    metric: 'revenue' | 'bookings' | 'rating' | 'trips',
    dateRange?: Partial<DateRange>,
    limit = 10
  ): Promise<CenterRanking[]> {
    const range = {
      ...this.getDefaultDateRange(),
      ...dateRange,
    };

    return centersAggregator.getCenterRanking(metric, range, limit);
  }

  /**
   * Compare multiple centers
   */
  async compareCenters(
    centerIds: string[],
    dateRange?: Partial<DateRange>
  ): Promise<CenterMetrics[]> {
    const range = {
      ...this.getDefaultDateRange(),
      ...dateRange,
    };

    return centersAggregator.compareCenters(centerIds, range);
  }

  /**
   * Get compliance metrics
   */
  async getComplianceMetrics(
    dateRange?: Partial<DateRange>
  ): Promise<ComplianceMetrics> {
    const range = {
      ...this.getDefaultDateRange(),
      ...dateRange,
    };

    const [quotaUtilization, conservationFees, incidents, certifications] = await Promise.all([
      this.getQuotaUtilization(range),
      this.getConservationFeeData(range),
      this.getIncidentStats(range),
      this.getCertificationStats(),
    ]);

    return {
      period: range,
      quotaUtilization,
      conservationFees,
      incidents,
      certifications,
    };
  }

  /**
   * Generate pre-built report
   */
  async generateReport(type: ReportType, dateRange?: Partial<DateRange>): Promise<ReportData> {
    const range = {
      ...this.getDefaultDateRange(),
      ...dateRange,
    };

    let data: Record<string, unknown>;

    switch (type) {
      case 'daily_summary':
        data = await this.getDailySummary(range);
        break;
      case 'weekly_digest':
        data = await this.getWeeklyDigest(range);
        break;
      case 'monthly_financial':
        data = await this.getMonthlyFinancial(range);
        break;
      case 'quarterly_review':
        data = await this.getQuarterlyReview(range);
        break;
      case 'center_performance':
        data = await this.getCenterPerformance(range);
        break;
      case 'compliance_audit':
        data = await this.getComplianceAudit(range);
        break;
      case 'user_growth':
        data = await this.getUserGrowth(range);
        break;
      default:
        throw new Error(`Unknown report type: ${type}`);
    }

    return {
      type,
      generatedAt: new Date().toISOString(),
      period: range,
      data,
    };
  }

  /**
   * Export data
   */
  async exportData(
    reportType: string,
    dateRange: DateRange,
    format: ExportFormat
  ): Promise<ExportResult> {
    if (format !== 'csv') {
      throw new Error('Only CSV format is currently supported');
    }

    let data: Record<string, unknown>[];
    let columns: ExportColumn[];
    const filename = `${reportType}_${dateRange.from}_${dateRange.to}`;

    switch (reportType) {
      case 'bookings':
        const bookingsData = await this.getBookingsExportData(dateRange);
        return csvExporter.exportBookings(bookingsData, filename);

      case 'revenue':
        const revenueData = await this.getRevenueExportData(dateRange);
        return csvExporter.exportRevenue(revenueData, filename);

      case 'users':
        const usersData = await this.getUsersExportData(dateRange);
        return csvExporter.exportUsers(usersData, filename);

      default:
        // For other report types, generate generic export
        const report = await this.generateReport(reportType as ReportType, dateRange);
        data = this.flattenReportData(report.data);
        columns = this.inferColumns(data);
        return csvExporter.exportReport(data, columns, reportType, dateRange);
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async getTotalTrips(dateRange: DateRange): Promise<number> {
    const result = await db.query<{ count: string }>(
      'SELECT COUNT(*) FROM trips WHERE date >= $1 AND date <= $2',
      [dateRange.from, dateRange.to]
    );
    return parseInt(result.rows[0].count, 10);
  }

  private async getActiveTrips(): Promise<number> {
    const result = await db.query<{ count: string }>(
      "SELECT COUNT(*) FROM trips WHERE status IN ('scheduled', 'boarding', 'in_progress') AND date >= CURRENT_DATE"
    );
    return parseInt(result.rows[0].count, 10);
  }

  private async getAverageFillRate(dateRange: DateRange): Promise<number> {
    const result = await db.query<{ avg_fill_rate: string }>(
      `SELECT
        COALESCE(AVG(
          CASE WHEN max_participants > 0
          THEN (current_participants::float / max_participants) * 100
          ELSE 0 END
        ), 0) as avg_fill_rate
       FROM trips
       WHERE date >= $1 AND date <= $2`,
      [dateRange.from, dateRange.to]
    );
    return parseFloat(result.rows[0].avg_fill_rate);
  }

  private async getPaymentStats(
    dateRange: DateRange
  ): Promise<{ total: number; successful: number; failed: number; refunded: number }> {
    const result = await db.query<{
      total: string;
      successful: string;
      failed: string;
      refunded: string;
    }>(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as successful,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'refunded') as refunded
       FROM payments
       WHERE created_at >= $1 AND created_at <= $2`,
      [dateRange.from, dateRange.to]
    );

    return {
      total: parseInt(result.rows[0].total, 10),
      successful: parseInt(result.rows[0].successful, 10),
      failed: parseInt(result.rows[0].failed, 10),
      refunded: parseInt(result.rows[0].refunded, 10),
    };
  }

  private async getQuotaUtilization(dateRange: DateRange): Promise<SiteQuotaData[]> {
    const result = await db.query<{
      site_id: string;
      site_name: string;
      daily_quota: string;
      avg_utilization: string;
      peak_utilization: string;
      total_reservations: string;
    }>(
      `SELECT
        ds.id as site_id,
        ds.name_en as site_name,
        ds.daily_diver_quota as daily_quota,
        COALESCE(AVG(sqr.divers_count::float / NULLIF(ds.daily_diver_quota, 0) * 100), 0) as avg_utilization,
        COALESCE(MAX(sqr.divers_count::float / NULLIF(ds.daily_diver_quota, 0) * 100), 0) as peak_utilization,
        COUNT(sqr.id) as total_reservations
       FROM dive_sites ds
       LEFT JOIN srsa_quota_reservations sqr ON sqr.site_code = ds.site_code
         AND sqr.reservation_date >= $1 AND sqr.reservation_date <= $2
       GROUP BY ds.id, ds.name_en, ds.daily_diver_quota
       ORDER BY avg_utilization DESC
       LIMIT 20`,
      [dateRange.from, dateRange.to]
    );

    return result.rows.map((row) => ({
      siteId: row.site_id,
      siteName: row.site_name,
      dailyQuota: parseInt(row.daily_quota, 10),
      avgUtilization: parseFloat(row.avg_utilization),
      peakUtilization: parseFloat(row.peak_utilization),
      totalReservations: parseInt(row.total_reservations, 10),
    }));
  }

  private async getConservationFeeData(dateRange: DateRange): Promise<ZoneFeeData[]> {
    const result = await db.query<{
      zone: string;
      fee_amount: string;
      total_collected: string;
      transaction_count: string;
    }>(
      `SELECT
        zone,
        fee_amount,
        COALESCE(SUM(amount), 0) as total_collected,
        COUNT(*) as transaction_count
       FROM conservation_fee_transactions
       WHERE created_at >= $1 AND created_at <= $2
         AND status = 'completed'
       GROUP BY zone, fee_amount
       ORDER BY zone`,
      [dateRange.from, dateRange.to]
    );

    return result.rows.map((row) => ({
      zone: row.zone,
      feeAmount: parseFloat(row.fee_amount),
      totalCollected: parseFloat(row.total_collected),
      transactionCount: parseInt(row.transaction_count, 10),
    }));
  }

  private async getIncidentStats(dateRange: DateRange): Promise<IncidentStats> {
    const totalResult = await db.query<{ count: string }>(
      `SELECT COUNT(*) FROM emergency_incidents
       WHERE created_at >= $1 AND created_at <= $2`,
      [dateRange.from, dateRange.to]
    );

    const severityResult = await db.query<{ severity: string; count: string }>(
      `SELECT severity, COUNT(*) as count
       FROM emergency_incidents
       WHERE created_at >= $1 AND created_at <= $2
       GROUP BY severity
       ORDER BY count DESC`,
      [dateRange.from, dateRange.to]
    );

    const trendResult = await db.query<{ date: Date; value: string }>(
      `SELECT DATE_TRUNC('day', created_at) as date, COUNT(*) as value
       FROM emergency_incidents
       WHERE created_at >= $1 AND created_at <= $2
       GROUP BY DATE_TRUNC('day', created_at)
       ORDER BY date ASC`,
      [dateRange.from, dateRange.to]
    );

    return {
      total: parseInt(totalResult.rows[0].count, 10),
      bySeverity: severityResult.rows.map((row) => ({
        severity: row.severity,
        count: parseInt(row.count, 10),
      })),
      trend: trendResult.rows.map((row) => ({
        date: row.date.toISOString().split('T')[0],
        value: parseInt(row.value, 10),
      })),
    };
  }

  private async getCertificationStats(): Promise<CertificationStats> {
    const result = await db.query<{
      total: string;
      pending: string;
      verified: string;
      rejected: string;
      expired: string;
    }>(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE verification_status = 'pending') as pending,
        COUNT(*) FILTER (WHERE verification_status = 'verified') as verified,
        COUNT(*) FILTER (WHERE verification_status = 'rejected') as rejected,
        COUNT(*) FILTER (WHERE expiry_date < CURRENT_DATE) as expired
       FROM certifications`
    );

    return {
      total: parseInt(result.rows[0].total, 10),
      pending: parseInt(result.rows[0].pending, 10),
      verified: parseInt(result.rows[0].verified, 10),
      rejected: parseInt(result.rows[0].rejected, 10),
      expired: parseInt(result.rows[0].expired, 10),
    };
  }

  // ============================================================================
  // REPORT GENERATORS
  // ============================================================================

  private async getDailySummary(dateRange: DateRange): Promise<Record<string, unknown>> {
    const overview = await this.getOverview(dateRange, true);
    return { ...overview };
  }

  private async getWeeklyDigest(dateRange: DateRange): Promise<Record<string, unknown>> {
    const [overview, bookings, revenue] = await Promise.all([
      this.getOverview(dateRange, true),
      this.getBookingMetrics(dateRange, 'day'),
      this.getRevenueMetrics(dateRange, 'day'),
    ]);

    return {
      overview,
      bookingTrend: bookings.trend,
      revenueTrend: revenue.trend,
      topCenters: revenue.byCenter.slice(0, 5),
    };
  }

  private async getMonthlyFinancial(dateRange: DateRange): Promise<Record<string, unknown>> {
    const revenue = await this.getRevenueMetrics(dateRange, 'day');
    return {
      total: revenue.total,
      breakdown: revenue.breakdown,
      byCenter: revenue.byCenter,
      byPaymentMethod: revenue.byPaymentMethod,
      trend: revenue.trend,
      refunds: revenue.refunds,
      growth: revenue.growth,
    };
  }

  private async getQuarterlyReview(dateRange: DateRange): Promise<Record<string, unknown>> {
    const [overview, users, bookings, revenue] = await Promise.all([
      this.getOverview(dateRange, true),
      this.getUserMetrics(dateRange, 'week'),
      this.getBookingMetrics(dateRange, 'week'),
      this.getRevenueMetrics(dateRange, 'week'),
    ]);

    return {
      overview,
      userGrowth: users.growth,
      bookingGrowth: bookings.growth,
      revenueGrowth: revenue.growth,
      trends: {
        registrations: users.registrations,
        bookings: bookings.trend,
        revenue: revenue.trend,
      },
    };
  }

  private async getCenterPerformance(dateRange: DateRange): Promise<Record<string, unknown>> {
    const [revenueRanking, bookingsRanking, ratingRanking] = await Promise.all([
      this.getCenterRankings('revenue', dateRange, 20),
      this.getCenterRankings('bookings', dateRange, 20),
      this.getCenterRankings('rating', dateRange, 20),
    ]);

    return {
      byRevenue: revenueRanking,
      byBookings: bookingsRanking,
      byRating: ratingRanking,
    };
  }

  private async getComplianceAudit(dateRange: DateRange): Promise<Record<string, unknown>> {
    const compliance = await this.getComplianceMetrics(dateRange);
    return { ...compliance };
  }

  private async getUserGrowth(dateRange: DateRange): Promise<Record<string, unknown>> {
    const users = await this.getUserMetrics(dateRange, 'day');
    return {
      total: users.total,
      registrations: users.registrations,
      activeUsers: users.activeUsers,
      byRole: users.byRole,
      topRegions: users.topRegions,
      growth: users.growth,
    };
  }

  // ============================================================================
  // EXPORT DATA HELPERS
  // ============================================================================

  private async getBookingsExportData(dateRange: DateRange): Promise<
    Array<{
      id: string;
      tripDate: string;
      centerName: string;
      siteName: string;
      diverName: string;
      status: string;
      totalPrice: number;
      createdAt: string;
    }>
  > {
    const result = await db.query<{
      id: string;
      trip_date: Date;
      center_name: string;
      site_name: string;
      diver_name: string;
      status: string;
      total_price: string;
      created_at: Date;
    }>(
      `SELECT
        tb.id,
        t.date as trip_date,
        dc.name_en as center_name,
        ds.name_en as site_name,
        CONCAT(dp.first_name_en, ' ', dp.last_name_en) as diver_name,
        tb.status,
        tb.total_price,
        tb.created_at
       FROM trip_bookings tb
       JOIN trips t ON tb.trip_id = t.id
       JOIN diving_centers dc ON t.center_id = dc.id
       JOIN dive_sites ds ON t.site_id = ds.id
       LEFT JOIN diver_profiles dp ON tb.user_id = dp.user_id
       WHERE tb.created_at >= $1 AND tb.created_at <= $2
       ORDER BY tb.created_at DESC`,
      [dateRange.from, dateRange.to]
    );

    return result.rows.map((row) => ({
      id: row.id,
      tripDate: row.trip_date.toISOString().split('T')[0],
      centerName: row.center_name,
      siteName: row.site_name,
      diverName: row.diver_name,
      status: row.status,
      totalPrice: parseFloat(row.total_price),
      createdAt: row.created_at.toISOString().split('T')[0],
    }));
  }

  private async getRevenueExportData(dateRange: DateRange): Promise<
    Array<{
      date: string;
      centerName: string;
      bookings: number;
      revenue: number;
      platformFee: number;
      conservationFee: number;
    }>
  > {
    const result = await db.query<{
      date: Date;
      center_name: string;
      bookings: string;
      revenue: string;
      platform_fee: string;
      conservation_fee: string;
    }>(
      `SELECT
        DATE_TRUNC('day', p.created_at) as date,
        dc.name_en as center_name,
        COUNT(tb.id) as bookings,
        COALESCE(SUM(p.amount), 0) as revenue,
        COALESCE(SUM(tb.platform_fee), 0) as platform_fee,
        COALESCE(SUM(tb.conservation_fee), 0) as conservation_fee
       FROM payments p
       JOIN trip_bookings tb ON p.booking_id = tb.id
       JOIN trips t ON tb.trip_id = t.id
       JOIN diving_centers dc ON t.center_id = dc.id
       WHERE p.created_at >= $1 AND p.created_at <= $2
         AND p.status = 'completed'
       GROUP BY DATE_TRUNC('day', p.created_at), dc.name_en
       ORDER BY date DESC, revenue DESC`,
      [dateRange.from, dateRange.to]
    );

    return result.rows.map((row) => ({
      date: row.date.toISOString().split('T')[0],
      centerName: row.center_name,
      bookings: parseInt(row.bookings, 10),
      revenue: parseFloat(row.revenue),
      platformFee: parseFloat(row.platform_fee),
      conservationFee: parseFloat(row.conservation_fee),
    }));
  }

  private async getUsersExportData(dateRange: DateRange): Promise<
    Array<{
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      status: string;
      createdAt: string;
    }>
  > {
    const result = await db.query<{
      id: string;
      email: string;
      first_name: string;
      last_name: string;
      role: string;
      status: string;
      created_at: Date;
    }>(
      `SELECT id, email, first_name, last_name, role, status, created_at
       FROM users
       WHERE created_at >= $1 AND created_at <= $2
       ORDER BY created_at DESC`,
      [dateRange.from, dateRange.to]
    );

    return result.rows.map((row) => ({
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role,
      status: row.status,
      createdAt: row.created_at.toISOString().split('T')[0],
    }));
  }

  private flattenReportData(data: Record<string, unknown>): Record<string, unknown>[] {
    // Simple flattening for export purposes
    if (Array.isArray(data)) {
      return data as Record<string, unknown>[];
    }
    return [data];
  }

  private inferColumns(data: Record<string, unknown>[]): ExportColumn[] {
    if (data.length === 0) return [];
    const firstRow = data[0];
    return Object.keys(firstRow).map((key) => ({
      key,
      header: key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
      format: typeof firstRow[key] === 'number' ? 'number' : 'string',
    }));
  }
}

export const analyticsService = new AnalyticsService();
