import { z } from 'zod';

// UUID parameter validation
export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

// Verify center schema
export const verifyCenterSchema = z.object({
  status: z.enum(['verified', 'rejected']),
  notes: z.string().max(1000).optional(),
}).refine(
  (data) => data.status !== 'rejected' || (data.notes && data.notes.length > 0),
  { message: 'Notes are required when rejecting', path: ['notes'] }
);

// Verify certification schema
export const verifyCertificationSchema = z.object({
  status: z.enum(['verified', 'rejected']),
  notes: z.string().max(1000).optional(),
}).refine(
  (data) => data.status !== 'rejected' || (data.notes && data.notes.length > 0),
  { message: 'Notes are required when rejecting', path: ['notes'] }
);

// Update user schema
export const adminUpdateUserSchema = z.object({
  role: z.enum(['diver', 'instructor', 'center_owner', 'center_staff', 'parent', 'admin', 'inspector']).optional(),
  status: z.enum(['pending_verification', 'active', 'suspended', 'deactivated']).optional(),
  notes: z.string().max(1000).optional(),
});

// Deactivate user schema
export const deactivateUserSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(1000),
});

// Moderate review schema
export const moderateReviewSchema = z.object({
  action: z.enum(['approve', 'hide', 'remove']),
  reason: z.string().max(1000).optional(),
}).refine(
  (data) => data.action === 'approve' || (data.reason && data.reason.length > 0),
  { message: 'Reason is required when hiding or removing', path: ['reason'] }
);

// Update site schema
export const updateSiteSchema = z.object({
  nameEn: z.string().min(1).max(200).optional(),
  nameAr: z.string().max(200).optional(),
  maxDepthMeters: z.number().int().positive().max(300).optional(),
  minDepthMeters: z.number().int().min(0).max(300).optional(),
  minCertificationLevel: z.string().max(100).optional(),
  minLoggedDives: z.number().int().min(0).optional(),
  dailyDiverQuota: z.number().int().positive().optional(),
  conservationZone: z.enum(['zone_0', 'zone_1', 'zone_2', 'zone_3']).optional(),
  conservationFeeSar: z.number().min(0).max(1000).optional(),
  marineProtectedArea: z.boolean().optional(),
  seasonalRestrictions: z.record(z.unknown()).optional(),
  hazards: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),
  marinLife: z.array(z.string()).optional(),
});

// Toggle site status schema
export const toggleSiteStatusSchema = z.object({
  isActive: z.boolean(),
  reason: z.string().max(500).optional(),
});

// Query schemas for filters
export const centerFiltersSchema = z.object({
  status: z.enum(['pending', 'verified', 'rejected', 'expired']).optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const certificationFiltersSchema = z.object({
  status: z.enum(['pending', 'verified', 'rejected', 'expired']).optional(),
  agency: z.string().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const userFiltersSchema = z.object({
  role: z.enum(['diver', 'instructor', 'center_owner', 'center_staff', 'parent', 'admin', 'inspector']).optional(),
  status: z.enum(['pending_verification', 'active', 'suspended', 'deactivated']).optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const reviewFiltersSchema = z.object({
  status: z.string().max(50).optional(),
  minReports: z.coerce.number().int().min(0).default(1),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const siteFiltersSchema = z.object({
  regionId: z.string().uuid().optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const auditLogFiltersSchema = z.object({
  userId: z.string().uuid().optional(),
  action: z.string().max(100).optional(),
  entityType: z.string().max(100).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
