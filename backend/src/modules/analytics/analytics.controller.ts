import { Request, Response } from 'express';
import { analyticsService } from './analytics.service';
import { asyncHandler } from '../../utils/helpers';
import {
  overviewQuerySchema,
  userMetricsQuerySchema,
  bookingMetricsQuerySchema,
  revenueMetricsQuerySchema,
  centerMetricsQuerySchema,
  centerIdParamSchema,
  complianceMetricsQuerySchema,
  reportTypeParamSchema,
  exportRequestSchema,
  centerComparisonQuerySchema,
  rankingQuerySchema,
} from './analytics.validation';
import { TimeGranularity, ReportType, ExportFormat } from './analytics.types';

/**
 * Get platform overview dashboard
 */
export const getOverview = asyncHandler(async (req: Request, res: Response) => {
  const query = overviewQuerySchema.parse(req.query);

  const dateRange = query.from && query.to ? { from: query.from, to: query.to } : undefined;
  const overview = await analyticsService.getOverview(dateRange, query.compare);

  res.json({
    success: true,
    data: overview,
  });
});

/**
 * Get user metrics
 */
export const getUserMetrics = asyncHandler(async (req: Request, res: Response) => {
  const query = userMetricsQuerySchema.parse(req.query);

  const dateRange = query.from && query.to ? { from: query.from, to: query.to } : undefined;
  const metrics = await analyticsService.getUserMetrics(
    dateRange,
    query.granularity as TimeGranularity
  );

  res.json({
    success: true,
    data: metrics,
  });
});

/**
 * Get booking metrics
 */
export const getBookingMetrics = asyncHandler(async (req: Request, res: Response) => {
  const query = bookingMetricsQuerySchema.parse(req.query);

  const dateRange = query.from && query.to ? { from: query.from, to: query.to } : undefined;
  const metrics = await analyticsService.getBookingMetrics(
    dateRange,
    query.granularity as TimeGranularity
  );

  res.json({
    success: true,
    data: metrics,
  });
});

/**
 * Get revenue metrics
 */
export const getRevenueMetrics = asyncHandler(async (req: Request, res: Response) => {
  const query = revenueMetricsQuerySchema.parse(req.query);

  const dateRange = query.from && query.to ? { from: query.from, to: query.to } : undefined;
  const metrics = await analyticsService.getRevenueMetrics(
    dateRange,
    query.granularity as TimeGranularity
  );

  res.json({
    success: true,
    data: metrics,
  });
});

/**
 * Get specific center metrics
 */
export const getCenterMetrics = asyncHandler(async (req: Request, res: Response) => {
  const params = centerIdParamSchema.parse(req.params);
  const query = centerMetricsQuerySchema.parse(req.query);

  const dateRange = query.from && query.to ? { from: query.from, to: query.to } : undefined;
  const metrics = await analyticsService.getCenterMetrics(params.id, dateRange);

  res.json({
    success: true,
    data: metrics,
  });
});

/**
 * Get center rankings
 */
export const getCenterRankings = asyncHandler(async (req: Request, res: Response) => {
  const query = rankingQuerySchema.parse(req.query);

  const dateRange = query.from && query.to ? { from: query.from, to: query.to } : undefined;
  const rankings = await analyticsService.getCenterRankings(
    query.metric as 'revenue' | 'bookings' | 'rating' | 'trips',
    dateRange,
    query.limit
  );

  res.json({
    success: true,
    data: rankings,
  });
});

/**
 * Compare multiple centers
 */
export const compareCenters = asyncHandler(async (req: Request, res: Response) => {
  const query = centerComparisonQuerySchema.parse(req.query);

  const dateRange = query.from && query.to ? { from: query.from, to: query.to } : undefined;
  const comparison = await analyticsService.compareCenters(query.centerIds, dateRange);

  res.json({
    success: true,
    data: comparison,
  });
});

/**
 * Get compliance metrics
 */
export const getComplianceMetrics = asyncHandler(async (req: Request, res: Response) => {
  const query = complianceMetricsQuerySchema.parse(req.query);

  const dateRange = query.from && query.to ? { from: query.from, to: query.to } : undefined;
  const metrics = await analyticsService.getComplianceMetrics(dateRange);

  res.json({
    success: true,
    data: metrics,
  });
});

/**
 * Get pre-built report
 */
export const getReport = asyncHandler(async (req: Request, res: Response) => {
  const params = reportTypeParamSchema.parse(req.params);
  const query = overviewQuerySchema.parse(req.query);

  const dateRange = query.from && query.to ? { from: query.from, to: query.to } : undefined;
  const report = await analyticsService.generateReport(params.type as ReportType, dateRange);

  res.json({
    success: true,
    data: report,
  });
});

/**
 * Export data
 */
export const exportData = asyncHandler(async (req: Request, res: Response) => {
  const body = exportRequestSchema.parse(req.body);

  const result = await analyticsService.exportData(
    body.reportType,
    { from: body.from, to: body.to },
    body.format as ExportFormat
  );

  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
  res.send(result.data);
});
