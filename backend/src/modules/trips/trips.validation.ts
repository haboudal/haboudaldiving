import { z } from 'zod';

export const tripTypeEnum = z.enum(['morning', 'afternoon', 'full_day', 'night', 'multi_day', 'liveaboard']);
export const tripStatusEnum = z.enum(['draft', 'published', 'full', 'in_progress', 'completed', 'cancelled']);
export const instructorRoleEnum = z.enum(['lead', 'assistant', 'divemaster']);

export const createTripSchema = z.object({
  vesselId: z.string().uuid().optional(),
  siteId: z.string().uuid().optional(),
  leadInstructorId: z.string().uuid().optional(),
  titleEn: z.string().min(3, 'Title must be at least 3 characters').max(200),
  titleAr: z.string().max(200).optional(),
  descriptionEn: z.string().max(5000).optional(),
  descriptionAr: z.string().max(5000).optional(),
  tripType: tripTypeEnum,
  departureDatetime: z.string().datetime({ message: 'Invalid departure datetime format' }),
  returnDatetime: z.string().datetime({ message: 'Invalid return datetime format' }),
  meetingPointEn: z.string().max(500).optional(),
  meetingPointAr: z.string().max(500).optional(),
  meetingPointLatitude: z.number().min(-90).max(90).optional(),
  meetingPointLongitude: z.number().min(-180).max(180).optional(),
  maxParticipants: z.number().int().min(1, 'Must have at least 1 participant').max(100),
  minParticipants: z.number().int().min(1).default(1),
  minCertificationLevel: z.string().max(100).optional(),
  minLoggedDives: z.number().int().min(0).default(0),
  minAge: z.number().int().min(8).max(100).default(10),
  maxAge: z.number().int().min(8).max(100).optional(),
  numberOfDives: z.number().int().min(1).max(10).default(2),
  includesEquipment: z.boolean().default(false),
  includesMeals: z.boolean().default(false),
  includesRefreshments: z.boolean().default(true),
  pricePerPersonSar: z.number().positive('Price must be positive'),
  equipmentRentalPriceSar: z.number().min(0).optional(),
  conservationFeeIncluded: z.boolean().default(false),
  cancellationPolicy: z.string().max(2000).optional(),
  cancellationDeadlineHours: z.number().int().min(0).default(24),
  reserveQuota: z.boolean().default(false),
}).refine((data) => {
  return new Date(data.departureDatetime) < new Date(data.returnDatetime);
}, {
  message: 'Return datetime must be after departure datetime',
  path: ['returnDatetime'],
}).refine((data) => {
  return new Date(data.departureDatetime) > new Date();
}, {
  message: 'Departure datetime must be in the future',
  path: ['departureDatetime'],
}).refine((data) => {
  if (data.maxAge && data.minAge) {
    return data.maxAge >= data.minAge;
  }
  return true;
}, {
  message: 'Maximum age must be greater than or equal to minimum age',
  path: ['maxAge'],
});

export const updateTripSchema = z.object({
  vesselId: z.string().uuid().optional().nullable(),
  siteId: z.string().uuid().optional().nullable(),
  leadInstructorId: z.string().uuid().optional().nullable(),
  titleEn: z.string().min(3).max(200).optional(),
  titleAr: z.string().max(200).optional().nullable(),
  descriptionEn: z.string().max(5000).optional().nullable(),
  descriptionAr: z.string().max(5000).optional().nullable(),
  tripType: tripTypeEnum.optional(),
  departureDatetime: z.string().datetime().optional(),
  returnDatetime: z.string().datetime().optional(),
  meetingPointEn: z.string().max(500).optional().nullable(),
  meetingPointAr: z.string().max(500).optional().nullable(),
  meetingPointLatitude: z.number().min(-90).max(90).optional().nullable(),
  meetingPointLongitude: z.number().min(-180).max(180).optional().nullable(),
  maxParticipants: z.number().int().min(1).max(100).optional(),
  minParticipants: z.number().int().min(1).optional(),
  minCertificationLevel: z.string().max(100).optional().nullable(),
  minLoggedDives: z.number().int().min(0).optional(),
  minAge: z.number().int().min(8).max(100).optional(),
  maxAge: z.number().int().min(8).max(100).optional().nullable(),
  numberOfDives: z.number().int().min(1).max(10).optional(),
  includesEquipment: z.boolean().optional(),
  includesMeals: z.boolean().optional(),
  includesRefreshments: z.boolean().optional(),
  pricePerPersonSar: z.number().positive().optional(),
  equipmentRentalPriceSar: z.number().min(0).optional().nullable(),
  conservationFeeIncluded: z.boolean().optional(),
  cancellationPolicy: z.string().max(2000).optional().nullable(),
  cancellationDeadlineHours: z.number().int().min(0).optional(),
});

export const tripFiltersSchema = z.object({
  centerId: z.string().uuid().optional(),
  siteId: z.string().uuid().optional(),
  status: tripStatusEnum.optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  tripType: tripTypeEnum.optional(),
  upcoming: z.string().transform(val => val === 'true').optional(),
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
});

export const addInstructorSchema = z.object({
  instructorId: z.string().uuid(),
  role: instructorRoleEnum.default('assistant'),
});

export type CreateTripInput = z.infer<typeof createTripSchema>;
export type UpdateTripInput = z.infer<typeof updateTripSchema>;
export type TripFiltersInput = z.infer<typeof tripFiltersSchema>;
export type AddInstructorInput = z.infer<typeof addInstructorSchema>;
