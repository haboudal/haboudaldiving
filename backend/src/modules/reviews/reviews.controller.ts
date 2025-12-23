import { Request, Response, NextFunction } from 'express';
import { reviewsService } from './reviews.service';
import {
  createReviewSchema,
  updateReviewSchema,
  respondToReviewSchema,
  reportReviewSchema,
  reviewFiltersSchema,
} from './reviews.validation';
import { ReviewableType } from './reviews.types';

export class ReviewsController {
  // ============================================================================
  // GET REVIEWS FOR CENTER
  // ============================================================================

  async getCenterReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const centerId = req.params.centerId;
      const filters = reviewFiltersSchema.parse(req.query);

      const result = await reviewsService.getReviewsForEntity('center', centerId, filters);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // GET REVIEWS FOR INSTRUCTOR
  // ============================================================================

  async getInstructorReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const instructorId = req.params.instructorId;
      const filters = reviewFiltersSchema.parse(req.query);

      const result = await reviewsService.getReviewsForEntity('instructor', instructorId, filters);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // GET MY REVIEWS
  // ============================================================================

  async getMyReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const filters = reviewFiltersSchema.parse(req.query);

      const { reviews, total } = await reviewsService.getUserReviews(userId, filters);

      const page = filters.page || 1;
      const limit = filters.limit || 10;

      res.json({
        success: true,
        data: {
          reviews,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // GET PENDING REVIEWS (reviews user can write)
  // ============================================================================

  async getPendingReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;

      const pendingReviews = await reviewsService.getPendingReviewsForUser(userId);

      res.json({
        success: true,
        data: {
          pendingReviews,
          total: pendingReviews.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // GET SINGLE REVIEW
  // ============================================================================

  async getReview(req: Request, res: Response, next: NextFunction) {
    try {
      const reviewId = req.params.id;

      const review = await reviewsService.getReviewById(reviewId);

      res.json({
        success: true,
        data: { review },
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // CREATE REVIEW
  // ============================================================================

  async createReview(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const dto = createReviewSchema.parse(req.body);

      const result = await reviewsService.createReview(userId, dto);

      res.status(201).json({
        success: true,
        message: 'Review created successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // UPDATE REVIEW
  // ============================================================================

  async updateReview(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const reviewId = req.params.id;
      const dto = updateReviewSchema.parse(req.body);

      const review = await reviewsService.updateReview(userId, reviewId, dto);

      res.json({
        success: true,
        message: 'Review updated successfully',
        data: { review },
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // DELETE REVIEW
  // ============================================================================

  async deleteReview(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const reviewId = req.params.id;

      await reviewsService.deleteReview(userId, reviewId);

      res.json({
        success: true,
        message: 'Review deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // RESPOND TO REVIEW (Center owners/staff)
  // ============================================================================

  async respondToReview(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const centerId = req.params.centerId;
      const reviewId = req.params.reviewId;
      const dto = respondToReviewSchema.parse(req.body);

      const review = await reviewsService.respondToReview(centerId, reviewId, dto, userId);

      res.json({
        success: true,
        message: 'Response added successfully',
        data: { review },
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // MARK REVIEW HELPFUL
  // ============================================================================

  async markHelpful(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const reviewId = req.params.id;

      const review = await reviewsService.markReviewHelpful(userId, reviewId);

      res.json({
        success: true,
        message: 'Review marked as helpful',
        data: { review },
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // REPORT REVIEW
  // ============================================================================

  async reportReview(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const reviewId = req.params.id;
      const { reason } = reportReviewSchema.parse(req.body);

      await reviewsService.reportReview(userId, reviewId, reason);

      res.json({
        success: true,
        message: 'Review reported successfully. Our team will review it shortly.',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const reviewsController = new ReviewsController();
