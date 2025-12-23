import { z } from 'zod';

// Create review schema
export const createReviewSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID'),
  reviewableType: z.enum(['center', 'instructor'], {
    errorMap: () => ({ message: 'Reviewable type must be center or instructor' }),
  }),
  reviewableId: z.string().uuid('Invalid reviewable ID'),
  rating: z.number()
    .int('Rating must be a whole number')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must be at most 5'),
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be at most 200 characters')
    .optional(),
  content: z.string()
    .min(10, 'Review content must be at least 10 characters')
    .max(2000, 'Review content must be at most 2000 characters')
    .optional(),
  pros: z.array(z.string().max(100)).max(5).optional(),
  cons: z.array(z.string().max(100)).max(5).optional(),
  photos: z.array(z.string().url('Invalid photo URL')).max(5).optional(),
});

// Update review schema
export const updateReviewSchema = z.object({
  rating: z.number()
    .int('Rating must be a whole number')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must be at most 5')
    .optional(),
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be at most 200 characters')
    .optional(),
  content: z.string()
    .min(10, 'Review content must be at least 10 characters')
    .max(2000, 'Review content must be at most 2000 characters')
    .optional(),
  pros: z.array(z.string().max(100)).max(5).optional(),
  cons: z.array(z.string().max(100)).max(5).optional(),
  photos: z.array(z.string().url('Invalid photo URL')).max(5).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

// Center response to review
export const respondToReviewSchema = z.object({
  response: z.string()
    .min(10, 'Response must be at least 10 characters')
    .max(1000, 'Response must be at most 1000 characters'),
});

// Report review schema
export const reportReviewSchema = z.object({
  reason: z.string()
    .min(10, 'Reason must be at least 10 characters')
    .max(500, 'Reason must be at most 500 characters'),
});

// Query filters schema
export const reviewFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  verifiedOnly: z.coerce.boolean().optional(),
  sortBy: z.enum(['newest', 'oldest', 'highest', 'lowest', 'helpful']).default('newest'),
});

// Types derived from schemas
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
export type RespondToReviewInput = z.infer<typeof respondToReviewSchema>;
export type ReportReviewInput = z.infer<typeof reportReviewSchema>;
export type ReviewFiltersInput = z.infer<typeof reviewFiltersSchema>;
