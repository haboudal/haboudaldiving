import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before importing the service
vi.mock('../../config/database', () => ({
  db: {
    query: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { ReviewsService } from '../../modules/reviews/reviews.service';
import { db } from '../../config/database';

describe('ReviewsService', () => {
  let reviewsService: ReviewsService;

  beforeEach(() => {
    reviewsService = new ReviewsService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getReviewById', () => {
    it('should return review when found', async () => {
      const mockReview = {
        id: 'review-123',
        user_id: 'user-123',
        booking_id: 'booking-123',
        reviewable_type: 'center',
        reviewable_id: 'center-123',
        rating: 5,
        title: 'Great dive!',
        content: 'Amazing experience',
        pros: ['professional', 'safe'],
        cons: [],
        photos: [],
        is_verified_booking: true,
        helpful_count: 10,
        reported_count: 0,
        status: 'published',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [mockReview],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await reviewsService.getReviewById('review-123');

      expect(result.id).toBe('review-123');
      expect(result.rating).toBe(5);
      expect(result.isVerifiedBooking).toBe(true);
    });

    it('should throw NotFoundError when review does not exist', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(reviewsService.getReviewById('non-existent')).rejects.toThrow('not found');
    });
  });

  describe('getReviewsForEntity', () => {
    it('should return reviews with stats for a center', async () => {
      const mockReviews = [
        {
          id: 'review-1',
          rating: 5,
          title: 'Excellent!',
          content: 'Great experience',
          pros: [],
          cons: [],
          photos: [],
          is_verified_booking: true,
          helpful_count: 5,
          center_response: null,
          created_at: new Date(),
          user_id: 'user-1',
          user_name: 'John',
          user_profile_photo: null,
          user_total_reviews: '3',
          user_total_dives: 50,
        },
      ];

      const mockStats = {
        average_rating: '4.5',
        total_reviews: '25',
        rating_1: '1',
        rating_2: '2',
        rating_3: '3',
        rating_4: '5',
        rating_5: '14',
        verified_percentage: '80',
      };

      vi.mocked(db.query)
        .mockResolvedValueOnce({ rows: mockReviews, rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ total: '25' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [mockStats], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });

      const result = await reviewsService.getReviewsForEntity('center', 'center-123', { page: 1, limit: 10 });

      expect(result.reviews).toHaveLength(1);
      expect(result.stats.averageRating).toBe(4.5);
      expect(result.stats.totalReviews).toBe(25);
      expect(result.pagination.page).toBe(1);
    });

    it('should filter by rating', async () => {
      vi.mocked(db.query)
        .mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
        .mockResolvedValueOnce({
          rows: [{ average_rating: '0', total_reviews: '0', rating_1: '0', rating_2: '0', rating_3: '0', rating_4: '0', rating_5: '0', verified_percentage: '0' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        });

      await reviewsService.getReviewsForEntity('center', 'center-123', { rating: 5 });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('r.rating = $'),
        expect.arrayContaining([5])
      );
    });
  });

  describe('createReview', () => {
    it('should throw NotFoundError if booking does not exist', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(
        reviewsService.createReview('user-123', {
          bookingId: 'non-existent',
          reviewableType: 'center',
          reviewableId: 'center-123',
          rating: 5,
        })
      ).rejects.toThrow('Booking not found');
    });

    it('should throw ForbiddenError if user does not own the booking', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: 'booking-123', user_id: 'other-user', center_id: 'center-123', status: 'completed', trip_id: 'trip-123' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(
        reviewsService.createReview('user-123', {
          bookingId: 'booking-123',
          reviewableType: 'center',
          reviewableId: 'center-123',
          rating: 5,
        })
      ).rejects.toThrow('only review your own');
    });

    it('should throw ValidationError if booking is not completed', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: 'booking-123', user_id: 'user-123', center_id: 'center-123', status: 'pending', trip_id: 'trip-123' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(
        reviewsService.createReview('user-123', {
          bookingId: 'booking-123',
          reviewableType: 'center',
          reviewableId: 'center-123',
          rating: 5,
        })
      ).rejects.toThrow('only review completed');
    });

    it('should throw ValidationError if review already exists', async () => {
      // Booking check
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: 'booking-123', user_id: 'user-123', center_id: 'center-123', status: 'completed', trip_id: 'trip-123' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Existing review check
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: 'existing-review' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(
        reviewsService.createReview('user-123', {
          bookingId: 'booking-123',
          reviewableType: 'center',
          reviewableId: 'center-123',
          rating: 5,
        })
      ).rejects.toThrow('already reviewed');
    });

    it('should successfully create a review', async () => {
      const mockReview = {
        id: 'new-review-123',
        user_id: 'user-123',
        booking_id: 'booking-123',
        reviewable_type: 'center',
        reviewable_id: 'center-123',
        rating: 5,
        title: 'Great dive!',
        content: 'Loved it',
        pros: ['professional'],
        cons: [],
        photos: [],
        is_verified_booking: true,
        helpful_count: 0,
        reported_count: 0,
        status: 'published',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Booking check
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: 'booking-123', user_id: 'user-123', center_id: 'center-123', status: 'completed', trip_id: 'trip-123' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // No existing review
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Insert review
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [mockReview],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      // Update entity rating - stats query
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ avg_rating: '4.5', total_reviews: '10' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Update diving center
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      const result = await reviewsService.createReview('user-123', {
        bookingId: 'booking-123',
        reviewableType: 'center',
        reviewableId: 'center-123',
        rating: 5,
        title: 'Great dive!',
        content: 'Loved it',
        pros: ['professional'],
      });

      expect(result.review.id).toBe('new-review-123');
      expect(result.ratingUpdated).toBe(true);
    });
  });

  describe('updateReview', () => {
    it('should throw ForbiddenError if user does not own the review', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{
          id: 'review-123',
          user_id: 'other-user',
          reviewable_type: 'center',
          reviewable_id: 'center-123',
          rating: 4,
          created_at: new Date().toISOString(),
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(
        reviewsService.updateReview('user-123', 'review-123', { rating: 5 })
      ).rejects.toThrow('only update your own');
    });

    it('should throw ValidationError if review is older than 7 days', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);

      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{
          id: 'review-123',
          user_id: 'user-123',
          reviewable_type: 'center',
          reviewable_id: 'center-123',
          rating: 4,
          created_at: oldDate.toISOString(),
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(
        reviewsService.updateReview('user-123', 'review-123', { rating: 5 })
      ).rejects.toThrow('within 7 days');
    });
  });

  describe('deleteReview', () => {
    it('should throw ForbiddenError if user does not own the review', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{
          id: 'review-123',
          user_id: 'other-user',
          reviewable_type: 'center',
          reviewable_id: 'center-123',
          created_at: new Date().toISOString(),
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(reviewsService.deleteReview('user-123', 'review-123')).rejects.toThrow('only delete your own');
    });

    it('should successfully delete review and update entity rating', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{
          id: 'review-123',
          user_id: 'user-123',
          reviewable_type: 'center',
          reviewable_id: 'center-123',
          created_at: new Date().toISOString(),
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Delete query
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'DELETE',
        oid: 0,
        fields: [],
      });

      // Stats query for rating update
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ avg_rating: '4.2', total_reviews: '9' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      // Update center rating
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      await expect(reviewsService.deleteReview('user-123', 'review-123')).resolves.toBeUndefined();
    });
  });

  describe('markReviewHelpful', () => {
    it('should increment helpful count', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{
          id: 'review-123',
          user_id: 'user-123',
          helpful_count: 11,
          created_at: new Date().toISOString(),
        }],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      const result = await reviewsService.markReviewHelpful('user-123', 'review-123');

      expect(result.helpfulCount).toBe(11);
    });

    it('should throw NotFoundError if review does not exist', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      await expect(reviewsService.markReviewHelpful('user-123', 'non-existent')).rejects.toThrow('not found');
    });
  });

  describe('reportReview', () => {
    it('should increment reported count and log audit', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [{ id: 'review-123' }],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      // Audit log insert
      vi.mocked(db.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      await expect(reviewsService.reportReview('user-123', 'review-123', 'Inappropriate content')).resolves.toBeUndefined();

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('audit_logs'),
        expect.arrayContaining(['user-123', 'review-123'])
      );
    });
  });
});
