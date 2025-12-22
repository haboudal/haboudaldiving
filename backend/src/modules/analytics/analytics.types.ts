// Analytics module types

// ============================================================================
// ENUMS & BASE TYPES
// ============================================================================

export type TimeGranularity = 'day' | 'week' | 'month' | 'quarter' | 'year';
export type ExportFormat = 'csv' | 'pdf';
export type ReportType =
  | 'daily_summary'
  | 'weekly_digest'
  | 'monthly_financial'
  | 'quarterly_review'
  | 'center_performance'
  | 'compliance_audit'
  | 'user_growth';

export interface DateRange {
  from: string;
  to: string;
}

// ============================================================================
// TIME SERIES DATA
// ============================================================================

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface TimeSeriesWithComparison {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
}

// ============================================================================
// DISTRIBUTION TYPES
// ============================================================================

export interface RoleDistribution {
  role: string;
  count: number;
  percentage: number;
}

export interface StatusDistribution {
  status: string;
  count: number;
  percentage: number;
}

export interface RegionData {
  regionId: string;
  regionName: string;
  count: number;
  percentage: number;
}

// ============================================================================
// PLATFORM OVERVIEW
// ============================================================================

export interface PlatformOverview {
  period: DateRange;
  users: {
    total: number;
    new: number;
    active: number;
    byRole: RoleDistribution[];
  };
  bookings: {
    total: number;
    completed: number;
    cancelled: number;
    revenue: number;
  };
  trips: {
    total: number;
    active: number;
    avgFillRate: number;
  };
  payments: {
    total: number;
    successful: number;
    failed: number;
    refunded: number;
  };
  comparison?: {
    users: TimeSeriesWithComparison;
    bookings: TimeSeriesWithComparison;
    revenue: TimeSeriesWithComparison;
  };
}

// ============================================================================
// USER ANALYTICS
// ============================================================================

export interface UserMetrics {
  period: DateRange;
  total: number;
  registrations: TimeSeriesPoint[];
  activeUsers: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  byRole: RoleDistribution[];
  byStatus: StatusDistribution[];
  topRegions: RegionData[];
  growth: TimeSeriesWithComparison;
}

export interface RetentionData {
  cohort: string;
  week1: number;
  week2: number;
  week3: number;
  week4: number;
  month2: number;
  month3: number;
}

// ============================================================================
// BOOKING ANALYTICS
// ============================================================================

export interface CenterBookings {
  centerId: string;
  centerName: string;
  bookings: number;
  revenue: number;
  percentage: number;
}

export interface SiteBookings {
  siteId: string;
  siteName: string;
  bookings: number;
  percentage: number;
}

export interface BookingMetrics {
  period: DateRange;
  total: number;
  byStatus: StatusDistribution[];
  byCenter: CenterBookings[];
  bySite: SiteBookings[];
  trend: TimeSeriesPoint[];
  averageValue: number;
  cancellationRate: number;
  growth: TimeSeriesWithComparison;
}

// ============================================================================
// REVENUE ANALYTICS
// ============================================================================

export interface RevenueBreakdown {
  baseFees: number;
  equipmentFees: number;
  conservationFees: number;
  insuranceFees: number;
  platformFees: number;
  vatCollected: number;
  discounts: number;
}

export interface CenterRevenue {
  centerId: string;
  centerName: string;
  revenue: number;
  bookings: number;
  platformFee: number;
  percentage: number;
}

export interface PaymentMethodRevenue {
  method: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface RefundStats {
  count: number;
  total: number;
  rate: number;
}

export interface RevenueMetrics {
  period: DateRange;
  total: number;
  breakdown: RevenueBreakdown;
  byCenter: CenterRevenue[];
  byPaymentMethod: PaymentMethodRevenue[];
  trend: TimeSeriesPoint[];
  refunds: RefundStats;
  growth: TimeSeriesWithComparison;
}

// ============================================================================
// CENTER ANALYTICS
// ============================================================================

export interface CenterTripStats {
  total: number;
  completed: number;
  cancelled: number;
  avgFillRate: number;
}

export interface CenterBookingStats {
  total: number;
  revenue: number;
  avgValue: number;
}

export interface CenterRating {
  average: number;
  count: number;
  distribution: { stars: number; count: number }[];
}

export interface CenterMetrics {
  centerId: string;
  centerName: string;
  period: DateRange;
  trips: CenterTripStats;
  bookings: CenterBookingStats;
  rating: CenterRating;
  topSites: SiteBookings[];
  trend: TimeSeriesPoint[];
}

export interface CenterRanking {
  centerId: string;
  centerName: string;
  metric: string;
  value: number;
  rank: number;
}

// ============================================================================
// COMPLIANCE ANALYTICS
// ============================================================================

export interface SiteQuotaData {
  siteId: string;
  siteName: string;
  dailyQuota: number;
  avgUtilization: number;
  peakUtilization: number;
  totalReservations: number;
}

export interface ZoneFeeData {
  zone: string;
  feeAmount: number;
  totalCollected: number;
  transactionCount: number;
}

export interface IncidentStats {
  total: number;
  bySeverity: { severity: string; count: number }[];
  trend: TimeSeriesPoint[];
}

export interface CertificationStats {
  total: number;
  pending: number;
  verified: number;
  rejected: number;
  expired: number;
}

export interface ComplianceMetrics {
  period: DateRange;
  quotaUtilization: SiteQuotaData[];
  conservationFees: ZoneFeeData[];
  incidents: IncidentStats;
  certifications: CertificationStats;
}

// ============================================================================
// QUERY TYPES
// ============================================================================

export interface AnalyticsQuery {
  from?: string;
  to?: string;
  granularity?: TimeGranularity;
  compare?: boolean;
}

export interface UserMetricsQuery extends AnalyticsQuery {
  groupBy?: 'role' | 'status' | 'region';
}

export interface BookingMetricsQuery extends AnalyticsQuery {
  centerId?: string;
  siteId?: string;
  status?: string;
}

export interface RevenueMetricsQuery extends AnalyticsQuery {
  centerId?: string;
  paymentMethod?: string;
}

export interface CenterMetricsQuery extends AnalyticsQuery {
  metric?: 'revenue' | 'bookings' | 'rating' | 'trips';
}

export interface ComplianceMetricsQuery extends AnalyticsQuery {
  siteId?: string;
  zone?: string;
}

// ============================================================================
// EXPORT TYPES
// ============================================================================

export interface ExportColumn {
  key: string;
  header: string;
  format?: 'string' | 'number' | 'currency' | 'date' | 'percentage';
}

export interface ExportRequest {
  reportType: ReportType;
  dateRange: DateRange;
  format: ExportFormat;
  filters?: Record<string, unknown>;
}

export interface ExportResult {
  filename: string;
  contentType: string;
  data: Buffer;
}

// ============================================================================
// REPORT TYPES
// ============================================================================

export interface ReportData {
  type: ReportType;
  generatedAt: string;
  period: DateRange;
  data: Record<string, unknown>;
}
