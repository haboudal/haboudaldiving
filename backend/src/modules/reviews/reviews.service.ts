import { db } from '../../config/database';
import { NotFoundError, ForbiddenError, ValidationError } from '../../utils/errors';
import {
  Review,
  ReviewForDisplay,
  ReviewStats,
  ReviewListResponse,
  CreateReviewDto,
  UpdateReviewDto,
  RespondToReviewDto,
  ReviewFilters,
  CreateReviewResult,
  ReviewableType,
} from './reviews.types';

export class ReviewsService {
  // ============================================================================
  // GET REVIEWS FOR ENTITY (Center or Instructor)
  // ============================================================================

  async getReviewsForEntity(
    reviewableType: ReviewableType,
    reviewableId: string,
    filters: ReviewFilters
  ): Promise<ReviewListResponse> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 10, 50);
    const offset = (page - 1) * limit;

    // Build query conditions
    const conditions: string[] = [
      'r.reviewable_type = $1',
      'r.reviewable_id = $2',
      "r.status = 'published'",
    ];
    const params: unknown[] = [reviewableType, reviewableId];
    let paramIndex = 3;

    if (filters.rating) {
      conditions.push(`r.rating = $${paramIndex++}`);
      params.push(filters.rating);
    }

    if (filters.verifiedOnly) {
      conditions.push('r.is_verified_booking = TRUE');
    }

    // Determine sort order
    let orderBy = 'r.created_at DESC';
    switch (filters.sortBy) {
      case 'oldest':
        orderBy = 'r.created_at ASC';
        break;
      case 'highest':
        orderBy = 'r.rating DESC, r.created_at DESC';
        break;
      case 'lowest':
        orderBy = 'r.rating ASC, r.created_at DESC';
        break;
      case 'helpful':
        orderBy = 'r.helpful_count DESC, r.created_at DESC';
        break;
    }

    // Get reviews with user details
    const reviewsQuery = `
      SELECT
        r.id,
        r.rating,
        r.title,
        r.content,
        r.pros,
        r.cons,
        r.photos,
        r.is_verified_booking,
        r.helpful_count,
        r.center_response,
        r.center_responded_at,
        r.created_at,
        u.id as user_id,
        COALESCE(dp.first_name_en, dp.first_name_ar, 'Anonymous') as user_name,
        dp.profile_photo_url as user_profile_photo,
        (SELECT COUNT(*) FROM reviews WHERE user_id = u.id AND status = 'published') as user_total_reviews,
        COALESCE(dp.total_logged_dives, 0) as user_total_dives
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN diver_profiles dp ON u.id = dp.user_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    params.push(limit, offset);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM reviews r
      WHERE ${conditions.slice(0, -2).join(' AND ') || conditions.join(' AND ')}
    `;

    // Get stats
    const statsQuery = `
      SELECT
        COALESCE(AVG(rating), 0) as average_rating,
        COUNT(*) as total_reviews,
        COUNT(*) FILTER (WHERE rating = 1) as rating_1,
        COUNT(*) FILTER (WHERE rating = 2) as rating_2,
        COUNT(*) FILTER (WHERE rating = 3) as rating_3,
        COUNT(*) FILTER (WHERE rating = 4) as rating_4,
        COUNT(*) FILTER (WHERE rating = 5) as rating_5,
        CASE
          WHEN COUNT(*) > 0
          THEN (COUNT(*) FILTER (WHERE is_verified_booking = TRUE) * 100.0 / COUNT(*))
          ELSE 0
        END as verified_percentage
      FROM reviews
      WHERE reviewable_type = $1 AND reviewable_id = $2 AND status = 'published'
    `;

    const [reviewsResult, countResult, statsResult] = await Promise.all([
      db.query(reviewsQuery, params),
      db.query(countQuery, params.slice(0, paramIndex - 3)),
      db.query(statsQuery, [reviewableType, reviewableId]),
    ]);

    const reviews: ReviewForDisplay[] = reviewsResult.rows.map((row) => ({
      id: row.id,
      rating: row.rating,
      title: row.title,
      content: row.content,
      pros: row.pros || [],
      cons: row.cons || [],
      photos: row.photos || [],
      isVerifiedBooking: row.is_verified_booking,
      helpfulCount: row.helpful_count,
      centerResponse: row.center_response,
      centerRespondedAt: row.center_responded_at,
      createdAt: row.created_at,
      user: {
        id: row.user_id,
        name: row.user_name,
        profilePhoto: row.user_profile_photo,
        totalReviews: parseInt(row.user_total_reviews, 10),
        totalDives: row.user_total_dives,
      },
    }));

    const statsRow = statsResult.rows[0];
    const stats: ReviewStats = {
      averageRating: parseFloat(statsRow.average_rating) || 0,
      totalReviews: parseInt(statsRow.total_reviews, 10),
      ratingDistribution: {
        1: parseInt(statsRow.rating_1, 10),
        2: parseInt(statsRow.rating_2, 10),
        3: parseInt(statsRow.rating_3, 10),
        4: parseInt(statsRow.rating_4, 10),
        5: parseInt(statsRow.rating_5, 10),
      },
      verifiedPercentage: parseFloat(statsRow.verified_percentage) || 0,
    };

    const total = parseInt(countResult.rows[0].total, 10);

    return {
      reviews,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================================================
  // GET USER'S REVIEWS
  // ============================================================================

  async getUserReviews(
    userId: string,
    filters: ReviewFilters
  ): Promise<{ reviews: Review[]; total: number }> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 10, 50);
    const offset = (page - 1) * limit;

    const query = `
      SELECT
        r.*,
        CASE
          WHEN r.reviewable_type = 'center' THEN (SELECT name_en FROM diving_centers WHERE id = r.reviewable_id)
          WHEN r.reviewable_type = 'instructor' THEN (
            SELECT COALESCE(dp.first_name_en || ' ' || dp.last_name_en, 'Instructor')
            FROM instructor_profiles ip
            JOIN diver_profiles dp ON ip.user_id = dp.user_id
            WHERE ip.user_id = r.reviewable_id
          )
        END as reviewable_name
      FROM reviews r
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(*) as total FROM reviews WHERE user_id = $1
    `;

    const [reviewsResult, countResult] = await Promise.all([
      db.query(query, [userId, limit, offset]),
      db.query(countQuery, [userId]),
    ]);

    const reviews = reviewsResult.rows.map(this.mapRowToReview);
    const total = parseInt(countResult.rows[0].total, 10);

    return { reviews, total };
  }

  // ============================================================================
  // GET SINGLE REVIEW
  // ============================================================================

  async getReviewById(reviewId: string): Promise<Review> {
    const query = `
      SELECT * FROM reviews WHERE id = $1
    `;

    const result = await db.query(query, [reviewId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Review not found');
    }

    return this.mapRowToReview(result.rows[0]);
  }

  // ============================================================================
  // CREATE REVIEW
  // ============================================================================

  async createReview(
    userId: string,
    dto: CreateReviewDto
  ): Promise<CreateReviewResult> {
    // Verify the booking exists and belongs to this user
    const bookingCheck = await db.query(
      `SELECT b.id, b.user_id, b.center_id, b.status, t.id as trip_id
       FROM bookings b
       JOIN trips t ON b.trip_id = t.id
       WHERE b.id = $1`,
      [dto.bookingId]
    );

    if (bookingCheck.rows.length === 0) {
      throw new NotFoundError('Booking not found');
    }

    const booking = bookingCheck.rows[0];

    if (booking.user_id !== userId) {
      throw new ForbiddenError('You can only review your own bookings');
    }

    if (booking.status !== 'completed') {
      throw new ValidationError('You can only review completed bookings');
    }

    // Verify the reviewable entity exists and is associated with the booking
    if (dto.reviewableType === 'center') {
      if (booking.center_id !== dto.reviewableId) {
        throw new ValidationError('This center is not associated with your booking');
      }
    } else if (dto.reviewableType === 'instructor') {
      // Check if instructor was on this trip
      const instructorCheck = await db.query(
        `SELECT id FROM trip_instructors WHERE trip_id = $1 AND instructor_id = $2`,
        [booking.trip_id, dto.reviewableId]
      );

      if (instructorCheck.rows.length === 0) {
        throw new ValidationError('This instructor was not part of your trip');
      }
    }

    // Check if user already reviewed this entity for this booking
    const existingReview = await db.query(
      `SELECT id FROM reviews
       WHERE user_id = $1 AND booking_id = $2
       AND reviewable_type = $3 AND reviewable_id = $4`,
      [userId, dto.bookingId, dto.reviewableType, dto.reviewableId]
    );

    if (existingReview.rows.length > 0) {
      throw new ValidationError('You have already reviewed this entity for this booking');
    }

    // Create the review
    const insertQuery = `
      INSERT INTO reviews (
        user_id, booking_id, reviewable_type, reviewable_id,
        rating, title, content, pros, cons, photos,
        is_verified_booking, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, 'published')
      RETURNING *
    `;

    const result = await db.query(insertQuery, [
      userId,
      dto.bookingId,
      dto.reviewableType,
      dto.reviewableId,
      dto.rating,
      dto.title || null,
      dto.content || null,
      dto.pros || [],
      dto.cons || [],
      dto.photos || [],
    ]);

    const review = this.mapRowToReview(result.rows[0]);

    // Update the rating on the reviewable entity
    await this.updateEntityRating(dto.reviewableType, dto.reviewableId);

    return { review, ratingUpdated: true };
  }

  // ============================================================================
  // UPDATE REVIEW
  // ============================================================================

  async updateReview(
    userId: string,
    reviewId: string,
    dto: UpdateReviewDto
  ): Promise<Review> {
    // Get existing review
    const existingReview = await this.getReviewById(reviewId);

    if (existingReview.userId !== userId) {
      throw new ForbiddenError('You can only update your own reviews');
    }

    // Check if review can be edited (within 7 days of creation)
    const createdAt = new Date(existingReview.createdAt);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    if (createdAt < sevenDaysAgo) {
      throw new ValidationError('Reviews can only be edited within 7 days of creation');
    }

    // Build update query
    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (dto.rating !== undefined) {
      updates.push(`rating = $${paramIndex++}`);
      params.push(dto.rating);
    }
    if (dto.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      params.push(dto.title);
    }
    if (dto.content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      params.push(dto.content);
    }
    if (dto.pros !== undefined) {
      updates.push(`pros = $${paramIndex++}`);
      params.push(dto.pros);
    }
    if (dto.cons !== undefined) {
      updates.push(`cons = $${paramIndex++}`);
      params.push(dto.cons);
    }
    if (dto.photos !== undefined) {
      updates.push(`photos = $${paramIndex++}`);
      params.push(dto.photos);
    }

    updates.push('updated_at = NOW()');
    params.push(reviewId);

    const query = `
      UPDATE reviews
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, params);
    const review = this.mapRowToReview(result.rows[0]);

    // Update rating if rating was changed
    if (dto.rating !== undefined && dto.rating !== existingReview.rating) {
      await this.updateEntityRating(
        existingReview.reviewableType as ReviewableType,
        existingReview.reviewableId
      );
    }

    return review;
  }

  // ============================================================================
  // DELETE REVIEW
  // ============================================================================

  async deleteReview(userId: string, reviewId: string): Promise<void> {
    const existingReview = await this.getReviewById(reviewId);

    if (existingReview.userId !== userId) {
      throw new ForbiddenError('You can only delete your own reviews');
    }

    await db.query('DELETE FROM reviews WHERE id = $1', [reviewId]);

    // Update the entity's rating
    await this.updateEntityRating(
      existingReview.reviewableType as ReviewableType,
      existingReview.reviewableId
    );
  }

  // ============================================================================
  // CENTER RESPONDS TO REVIEW
  // ============================================================================

  async respondToReview(
    centerId: string,
    reviewId: string,
    dto: RespondToReviewDto,
    respondedByUserId: string
  ): Promise<Review> {
    // Verify the review is for this center
    const review = await this.getReviewById(reviewId);

    if (review.reviewableType !== 'center' || review.reviewableId !== centerId) {
      throw new ForbiddenError('This review is not for your center');
    }

    // Verify the user is the center owner or staff
    const ownerCheck = await db.query(
      `SELECT id FROM diving_centers WHERE id = $1 AND owner_user_id = $2
       UNION
       SELECT center_id FROM center_staff WHERE center_id = $1 AND user_id = $2 AND is_active = TRUE`,
      [centerId, respondedByUserId]
    );

    if (ownerCheck.rows.length === 0) {
      throw new ForbiddenError('You do not have permission to respond to reviews for this center');
    }

    if (review.centerResponse) {
      throw new ValidationError('This review already has a response');
    }

    const result = await db.query(
      `UPDATE reviews
       SET center_response = $1, center_responded_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [dto.response, reviewId]
    );

    return this.mapRowToReview(result.rows[0]);
  }

  // ============================================================================
  // MARK REVIEW AS HELPFUL
  // ============================================================================

  async markReviewHelpful(userId: string, reviewId: string): Promise<Review> {
    // In a full implementation, you would track which users marked which reviews helpful
    // For now, we'll just increment the count
    const result = await db.query(
      `UPDATE reviews
       SET helpful_count = helpful_count + 1
       WHERE id = $1 AND status = 'published'
       RETURNING *`,
      [reviewId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Review not found');
    }

    return this.mapRowToReview(result.rows[0]);
  }

  // ============================================================================
  // REPORT REVIEW
  // ============================================================================

  async reportReview(
    userId: string,
    reviewId: string,
    reason: string
  ): Promise<void> {
    // Increment reported count
    const result = await db.query(
      `UPDATE reviews
       SET reported_count = reported_count + 1
       WHERE id = $1 AND status = 'published'
       RETURNING id`,
      [reviewId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Review not found');
    }

    // Log the report for admin review
    await db.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
       VALUES ($1, 'review_reported', 'review', $2, $3)`,
      [userId, reviewId, JSON.stringify({ reason })]
    );
  }

  // ============================================================================
  // GET PENDING REVIEWS FOR USER (reviews they can write)
  // ============================================================================

  async getPendingReviewsForUser(userId: string): Promise<{
    bookingId: string;
    tripTitle: string;
    tripDate: string;
    centerName: string;
    centerId: string;
    canReviewCenter: boolean;
    instructors: { id: string; name: string; canReview: boolean }[];
  }[]> {
    // Get completed bookings without center reviews
    const query = `
      SELECT
        b.id as booking_id,
        b.center_id,
        t.title_en as trip_title,
        t.departure_datetime as trip_date,
        dc.name_en as center_name,
        (SELECT COUNT(*) FROM reviews
         WHERE user_id = $1 AND booking_id = b.id
         AND reviewable_type = 'center' AND reviewable_id = b.center_id) = 0 as can_review_center
      FROM bookings b
      JOIN trips t ON b.trip_id = t.id
      JOIN diving_centers dc ON b.center_id = dc.id
      WHERE b.user_id = $1
        AND b.status = 'completed'
        AND t.departure_datetime > NOW() - INTERVAL '30 days'
      ORDER BY t.departure_datetime DESC
    `;

    const bookingsResult = await db.query(query, [userId]);

    const pendingReviews = await Promise.all(
      bookingsResult.rows.map(async (booking) => {
        // Get instructors for this trip
        const instructorsQuery = `
          SELECT
            ti.instructor_id as id,
            COALESCE(dp.first_name_en || ' ' || dp.last_name_en, 'Instructor') as name,
            (SELECT COUNT(*) FROM reviews
             WHERE user_id = $1 AND booking_id = $2
             AND reviewable_type = 'instructor' AND reviewable_id = ti.instructor_id) = 0 as can_review
          FROM trip_instructors ti
          JOIN trips t ON ti.trip_id = t.id
          JOIN bookings b ON t.id = b.trip_id AND b.id = $2
          LEFT JOIN diver_profiles dp ON ti.instructor_id = dp.user_id
        `;

        const instructorsResult = await db.query(instructorsQuery, [userId, booking.booking_id]);

        return {
          bookingId: booking.booking_id,
          tripTitle: booking.trip_title,
          tripDate: booking.trip_date,
          centerName: booking.center_name,
          centerId: booking.center_id,
          canReviewCenter: booking.can_review_center,
          instructors: instructorsResult.rows.map((i) => ({
            id: i.id,
            name: i.name,
            canReview: i.can_review,
          })),
        };
      })
    );

    // Filter to only include bookings with pending reviews
    return pendingReviews.filter(
      (p) => p.canReviewCenter || p.instructors.some((i) => i.canReview)
    );
  }

  // ============================================================================
  // HELPER: Update entity rating
  // ============================================================================

  private async updateEntityRating(
    type: ReviewableType,
    entityId: string
  ): Promise<void> {
    const statsQuery = `
      SELECT
        COALESCE(AVG(rating), 0) as avg_rating,
        COUNT(*) as total_reviews
      FROM reviews
      WHERE reviewable_type = $1
        AND reviewable_id = $2
        AND status = 'published'
    `;

    const stats = await db.query(statsQuery, [type, entityId]);
    const avgRating = parseFloat(stats.rows[0].avg_rating) || 0;
    const totalReviews = parseInt(stats.rows[0].total_reviews, 10);

    if (type === 'center') {
      await db.query(
        `UPDATE diving_centers
         SET rating_average = $1, total_reviews = $2, updated_at = NOW()
         WHERE id = $3`,
        [avgRating, totalReviews, entityId]
      );
    } else if (type === 'instructor') {
      await db.query(
        `UPDATE instructor_profiles
         SET rating_average = $1, total_reviews = $2, updated_at = NOW()
         WHERE user_id = $3`,
        [avgRating, totalReviews, entityId]
      );
    }
  }

  // ============================================================================
  // HELPER: Map database row to Review object
  // ============================================================================

  private mapRowToReview(row: Record<string, unknown>): Review {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      bookingId: row.booking_id as string | null,
      reviewableType: row.reviewable_type as ReviewableType,
      reviewableId: row.reviewable_id as string,
      rating: row.rating as number,
      title: row.title as string | null,
      content: row.content as string | null,
      pros: (row.pros as string[]) || [],
      cons: (row.cons as string[]) || [],
      photos: (row.photos as string[]) || [],
      isVerifiedBooking: row.is_verified_booking as boolean,
      helpfulCount: row.helpful_count as number,
      reportedCount: row.reported_count as number,
      centerResponse: row.center_response as string | null,
      centerRespondedAt: row.center_responded_at as string | null,
      status: row.status as Review['status'],
      moderatedAt: row.moderated_at as string | null,
      moderatedBy: row.moderated_by as string | null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}

export const reviewsService = new ReviewsService();
