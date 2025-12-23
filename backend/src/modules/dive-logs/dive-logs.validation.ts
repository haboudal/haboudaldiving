import { z } from 'zod';

// Enums
const diveTypeEnum = z.enum([
  'recreational', 'training', 'night', 'deep', 'drift', 'wreck', 'cave', 'photography', 'other'
]);

const entryTypeEnum = z.enum(['shore', 'boat', 'pier', 'platform']);

const suitTypeEnum = z.enum([
  'none', 'shorty', 'wetsuit_3mm', 'wetsuit_5mm', 'wetsuit_7mm', 'semi_dry', 'dry_suit'
]);

const tankTypeEnum = z.enum([
  'aluminum_80', 'aluminum_63', 'steel_80', 'steel_100', 'steel_120', 'twinset', 'sidemount'
]);

const gasMixtureEnum = z.enum(['air', 'nitrox_32', 'nitrox_36', 'trimix', 'other']);

const currentConditionEnum = z.enum(['none', 'light', 'moderate', 'strong', 'variable']);

const weatherConditionEnum = z.enum(['sunny', 'cloudy', 'overcast', 'rainy', 'windy', 'stormy']);

// Time format validation (HH:MM or HH:MM:SS)
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

// Create dive log schema
export const createDiveLogSchema = z.object({
  tripId: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional(),
  siteId: z.string().uuid().optional(),
  diveNumber: z.number().int().min(1).max(99999).optional(),
  diveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  entryTime: z.string().regex(timeRegex, 'Time must be in HH:MM format').optional(),
  exitTime: z.string().regex(timeRegex, 'Time must be in HH:MM format').optional(),
  bottomTimeMinutes: z.number().int().min(1).max(600).optional(),
  maxDepthMeters: z.number().min(0).max(350).optional(),
  avgDepthMeters: z.number().min(0).max(350).optional(),
  waterTempC: z.number().int().min(-5).max(40).optional(),
  visibilityMeters: z.number().int().min(0).max(100).optional(),
  weightKg: z.number().min(0).max(50).optional(),
  suitType: suitTypeEnum.optional(),
  tankType: tankTypeEnum.optional(),
  tankSizeLiters: z.number().int().min(5).max(30).optional(),
  startPressureBar: z.number().int().min(0).max(300).optional(),
  endPressureBar: z.number().int().min(0).max(300).optional(),
  gasMixture: gasMixtureEnum.default('air'),
  diveType: diveTypeEnum.optional(),
  entryType: entryTypeEnum.optional(),
  currentConditions: currentConditionEnum.optional(),
  weatherConditions: weatherConditionEnum.optional(),
  buddyName: z.string().max(200).optional(),
  buddyUserId: z.string().uuid().optional(),
  instructorId: z.string().uuid().optional(),
  notes: z.string().max(2000).optional(),
  marineLifeSpotted: z.array(z.string().max(100)).max(20).optional(),
  photos: z.array(z.string().url()).max(10).optional(),
  computerData: z.record(z.unknown()).optional(),
  isTrainingDive: z.boolean().default(false),
}).refine(
  (data) => {
    if (data.startPressureBar && data.endPressureBar) {
      return data.startPressureBar >= data.endPressureBar;
    }
    return true;
  },
  { message: 'Start pressure must be greater than or equal to end pressure' }
).refine(
  (data) => {
    if (data.maxDepthMeters && data.avgDepthMeters) {
      return data.maxDepthMeters >= data.avgDepthMeters;
    }
    return true;
  },
  { message: 'Max depth must be greater than or equal to average depth' }
);

// Update dive log schema
export const updateDiveLogSchema = z.object({
  tripId: z.string().uuid().nullable().optional(),
  bookingId: z.string().uuid().nullable().optional(),
  siteId: z.string().uuid().nullable().optional(),
  diveNumber: z.number().int().min(1).max(99999).nullable().optional(),
  diveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  entryTime: z.string().regex(timeRegex, 'Time must be in HH:MM format').nullable().optional(),
  exitTime: z.string().regex(timeRegex, 'Time must be in HH:MM format').nullable().optional(),
  bottomTimeMinutes: z.number().int().min(1).max(600).nullable().optional(),
  maxDepthMeters: z.number().min(0).max(350).nullable().optional(),
  avgDepthMeters: z.number().min(0).max(350).nullable().optional(),
  waterTempC: z.number().int().min(-5).max(40).nullable().optional(),
  visibilityMeters: z.number().int().min(0).max(100).nullable().optional(),
  weightKg: z.number().min(0).max(50).nullable().optional(),
  suitType: suitTypeEnum.nullable().optional(),
  tankType: tankTypeEnum.nullable().optional(),
  tankSizeLiters: z.number().int().min(5).max(30).nullable().optional(),
  startPressureBar: z.number().int().min(0).max(300).nullable().optional(),
  endPressureBar: z.number().int().min(0).max(300).nullable().optional(),
  gasMixture: gasMixtureEnum.optional(),
  diveType: diveTypeEnum.nullable().optional(),
  entryType: entryTypeEnum.nullable().optional(),
  currentConditions: currentConditionEnum.nullable().optional(),
  weatherConditions: weatherConditionEnum.nullable().optional(),
  buddyName: z.string().max(200).nullable().optional(),
  buddyUserId: z.string().uuid().nullable().optional(),
  instructorId: z.string().uuid().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  marineLifeSpotted: z.array(z.string().max(100)).max(20).optional(),
  photos: z.array(z.string().url()).max(10).optional(),
  computerData: z.record(z.unknown()).nullable().optional(),
  isTrainingDive: z.boolean().optional(),
});

// Verify dive log schema (instructor signature)
export const verifyDiveLogSchema = z.object({
  signatureUrl: z.string().url().optional(),
});

// Filter schema
export const diveLogFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  siteId: z.string().uuid().optional(),
  diveType: diveTypeEnum.optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  minDepth: z.coerce.number().min(0).optional(),
  maxDepth: z.coerce.number().max(350).optional(),
  verified: z.coerce.boolean().optional(),
  sortBy: z.enum(['date', 'depth', 'duration', 'created']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Import computer data schema
export const importComputerDataSchema = z.object({
  computerBrand: z.string().min(1).max(100),
  computerModel: z.string().max(100).optional(),
  dives: z.array(z.object({
    diveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    entryTime: z.string().regex(timeRegex).optional(),
    exitTime: z.string().regex(timeRegex).optional(),
    bottomTimeMinutes: z.number().int().min(1).max(600),
    maxDepthMeters: z.number().min(0).max(350),
    avgDepthMeters: z.number().min(0).max(350).optional(),
    waterTempC: z.number().int().min(-5).max(40).optional(),
    startPressureBar: z.number().int().min(0).max(300).optional(),
    endPressureBar: z.number().int().min(0).max(300).optional(),
    gasMixture: gasMixtureEnum.optional(),
    rawData: z.record(z.unknown()).optional(),
  })).min(1).max(100),
});

// Types derived from schemas
export type CreateDiveLogInput = z.infer<typeof createDiveLogSchema>;
export type UpdateDiveLogInput = z.infer<typeof updateDiveLogSchema>;
export type VerifyDiveLogInput = z.infer<typeof verifyDiveLogSchema>;
export type DiveLogFiltersInput = z.infer<typeof diveLogFiltersSchema>;
export type ImportComputerDataInput = z.infer<typeof importComputerDataSchema>;
