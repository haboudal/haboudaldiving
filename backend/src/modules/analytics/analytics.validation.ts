import { z } from 'zod';

// Date validation helper
const dateStringSchema = z.string().refine(
  (val) => !isNaN(Date.parse(val)),
  { message: 'Invalid date format' }
);

// Base date range schema
export const dateRangeSchema = z.object({
  from: dateStringSchema.optional(),
  to: dateStringSchema.optional(),
}).refine(
  (data) => {
    if (data.from && data.to) {
      return new Date(data.from) <= new Date(data.to);
    }
    return true;
  },
  { message: 'From date must be before or equal to To date', path: ['from'] }
);

// Granularity schema
export const granularitySchema = z.enum(['day', 'week', 'month', 'quarter', 'year']);

// Base analytics query schema
export const analyticsQuerySchema = z.object({
  from: dateStringSchema.optional(),
  to: dateStringSchema.optional(),
  granularity: granularitySchema.optional().default('day'),
  compare: z.coerce.boolean().optional().default(false),
});

// Overview query schema
export const overviewQuerySchema = analyticsQuerySchema;

// User metrics query schema
export const userMetricsQuerySchema = analyticsQuerySchema.extend({
  groupBy: z.enum(['role', 'status', 'region']).optional(),
});

// Booking metrics query schema
export const bookingMetricsQuerySchema = analyticsQuerySchema.extend({
  centerId: z.string().uuid().optional(),
  siteId: z.string().uuid().optional(),
  status: z.enum(['pending', 'confirmed', 'paid', 'checked_in', 'completed', 'cancelled', 'refunded']).optional(),
});

// Revenue metrics query schema
export const revenueMetricsQuerySchema = analyticsQuerySchema.extend({
  centerId: z.string().uuid().optional(),
  paymentMethod: z.string().optional(),
});

// Center metrics query schema
export const centerMetricsQuerySchema = analyticsQuerySchema.extend({
  metric: z.enum(['revenue', 'bookings', 'rating', 'trips']).optional().default('revenue'),
});

// Center ID param schema
export const centerIdParamSchema = z.object({
  id: z.string().uuid('Invalid center ID'),
});

// Compliance metrics query schema
export const complianceMetricsQuerySchema = analyticsQuerySchema.extend({
  siteId: z.string().uuid().optional(),
  zone: z.enum(['zone_0', 'zone_1', 'zone_2', 'zone_3']).optional(),
});

// Report type param schema
export const reportTypeParamSchema = z.object({
  type: z.enum([
    'daily_summary',
    'weekly_digest',
    'monthly_financial',
    'quarterly_review',
    'center_performance',
    'compliance_audit',
    'user_growth',
  ]),
});

// Export request schema
export const exportRequestSchema = z.object({
  reportType: z.enum([
    'daily_summary',
    'weekly_digest',
    'monthly_financial',
    'quarterly_review',
    'center_performance',
    'compliance_audit',
    'user_growth',
    'bookings',
    'revenue',
    'users',
  ]),
  from: dateStringSchema,
  to: dateStringSchema,
  format: z.enum(['csv', 'pdf']),
  filters: z.record(z.unknown()).optional(),
}).refine(
  (data) => new Date(data.from) <= new Date(data.to),
  { message: 'From date must be before or equal to To date', path: ['from'] }
);

// Center comparison query schema
export const centerComparisonQuerySchema = analyticsQuerySchema.extend({
  centerIds: z.string().transform((val) => val.split(',')).pipe(
    z.array(z.string().uuid()).min(2).max(10)
  ),
});

// Ranking query schema
export const rankingQuerySchema = analyticsQuerySchema.extend({
  metric: z.enum(['revenue', 'bookings', 'rating', 'trips']).optional().default('revenue'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});
