import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import * as analyticsController from './analytics.controller';

const router = Router();

// All analytics routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// ============================================================================
// OVERVIEW
// ============================================================================

/**
 * @route   GET /api/v1/analytics/overview
 * @desc    Get platform overview dashboard
 * @access  Admin
 * @query   from, to, granularity, compare
 */
router.get('/overview', analyticsController.getOverview);

// ============================================================================
// USER ANALYTICS
// ============================================================================

/**
 * @route   GET /api/v1/analytics/users
 * @desc    Get user metrics
 * @access  Admin
 * @query   from, to, granularity, groupBy
 */
router.get('/users', analyticsController.getUserMetrics);

// ============================================================================
// BOOKING ANALYTICS
// ============================================================================

/**
 * @route   GET /api/v1/analytics/bookings
 * @desc    Get booking metrics
 * @access  Admin
 * @query   from, to, granularity, centerId, siteId, status
 */
router.get('/bookings', analyticsController.getBookingMetrics);

// ============================================================================
// REVENUE ANALYTICS
// ============================================================================

/**
 * @route   GET /api/v1/analytics/revenue
 * @desc    Get revenue metrics
 * @access  Admin
 * @query   from, to, granularity, centerId, paymentMethod
 */
router.get('/revenue', analyticsController.getRevenueMetrics);

// ============================================================================
// CENTER ANALYTICS
// ============================================================================

/**
 * @route   GET /api/v1/analytics/centers/ranking
 * @desc    Get center rankings
 * @access  Admin
 * @query   from, to, metric, limit
 */
router.get('/centers/ranking', analyticsController.getCenterRankings);

/**
 * @route   GET /api/v1/analytics/centers/comparison
 * @desc    Compare multiple centers
 * @access  Admin
 * @query   centerIds (comma-separated), from, to
 */
router.get('/centers/comparison', analyticsController.compareCenters);

/**
 * @route   GET /api/v1/analytics/centers/:id
 * @desc    Get specific center metrics
 * @access  Admin
 * @query   from, to, metric
 */
router.get('/centers/:id', analyticsController.getCenterMetrics);

// ============================================================================
// COMPLIANCE
// ============================================================================

/**
 * @route   GET /api/v1/analytics/compliance
 * @desc    Get compliance metrics
 * @access  Admin
 * @query   from, to, siteId, zone
 */
router.get('/compliance', analyticsController.getComplianceMetrics);

// ============================================================================
// REPORTS & EXPORT
// ============================================================================

/**
 * @route   GET /api/v1/analytics/reports/:type
 * @desc    Get pre-built report
 * @access  Admin
 * @params  type: daily_summary|weekly_digest|monthly_financial|quarterly_review|center_performance|compliance_audit|user_growth
 * @query   from, to
 */
router.get('/reports/:type', analyticsController.getReport);

/**
 * @route   POST /api/v1/analytics/export
 * @desc    Export data in various formats
 * @access  Admin
 * @body    reportType, from, to, format
 */
router.post('/export', analyticsController.exportData);

export default router;
