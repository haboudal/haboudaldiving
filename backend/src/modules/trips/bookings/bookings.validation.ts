import { z } from 'zod';

export const bookingStatusEnum = z.enum(['pending', 'confirmed', 'paid', 'checked_in', 'completed', 'cancelled', 'refunded']);

export const equipmentSizesSchema = z.object({
  wetsuit: z.string().max(10).optional(),
  bcd: z.string().max(10).optional(),
  fins: z.string().max(10).optional(),
  boots: z.string().max(10).optional(),
  mask: z.string().max(20).optional(),
}).optional();

export const createBookingSchema = z.object({
  numberOfDivers: z.number().int().min(1, 'Must book for at least 1 diver').max(20).default(1),
  needsEquipment: z.boolean().default(false),
  specialRequests: z.string().max(1000).optional(),
  dietaryRequirements: z.string().max(500).optional(),
  equipmentSizes: equipmentSizesSchema,
});

export const updateBookingSchema = z.object({
  specialRequests: z.string().max(1000).optional().nullable(),
  dietaryRequirements: z.string().max(500).optional().nullable(),
  equipmentSizes: equipmentSizesSchema,
});

export const cancelBookingSchema = z.object({
  reason: z.string().min(10, 'Please provide a reason (at least 10 characters)').max(500),
});

export const bookingFiltersSchema = z.object({
  status: bookingStatusEnum.optional(),
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
});

export const signWaiverSchema = z.object({
  signature: z.string().min(1, 'Signature is required'),
  agreedToTerms: z.boolean().refine(val => val === true, {
    message: 'You must agree to the terms and conditions',
  }),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type BookingFiltersInput = z.infer<typeof bookingFiltersSchema>;
export type SignWaiverInput = z.infer<typeof signWaiverSchema>;
