// Reviews module types

// Reviewable entity types
export type ReviewableType = 'center' | 'instructor';

// Review status
export type ReviewStatus = 'pending' | 'published' | 'hidden' | 'removed';

// Base review interface
export interface Review {
  id: string;
  userId: string;
  bookingId: string | null;
  reviewableType: ReviewableType;
  reviewableId: string;
  rating: number;
  title: string | null;
  content: string | null;
  pros: string[];
  cons: string[];
  photos: string[];
  isVerifiedBooking: boolean;
  helpfulCount: number;
  reportedCount: number;
  centerResponse: string | null;
  centerRespondedAt: string | null;
  status: ReviewStatus;
  moderatedAt: string | null;
  moderatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// Review with user details
export interface ReviewWithDetails extends Review {
  userName: string;
  userProfilePhoto: string | null;
  reviewableName: string;
}

// Review with full details for display
export interface ReviewForDisplay {
  id: string;
  rating: number;
  title: string | null;
  content: string | null;
  pros: string[];
  cons: string[];
  photos: string[];
  isVerifiedBooking: boolean;
  helpfulCount: number;
  centerResponse: string | null;
  centerRespondedAt: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    profilePhoto: string | null;
    totalReviews: number;
    totalDives: number;
  };
}

// Review statistics
export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  verifiedPercentage: number;
}

// DTOs
export interface CreateReviewDto {
  bookingId: string;
  reviewableType: ReviewableType;
  reviewableId: string;
  rating: number;
  title?: string;
  content?: string;
  pros?: string[];
  cons?: string[];
  photos?: string[];
}

export interface UpdateReviewDto {
  rating?: number;
  title?: string;
  content?: string;
  pros?: string[];
  cons?: string[];
  photos?: string[];
}

export interface RespondToReviewDto {
  response: string;
}

export interface ReportReviewDto {
  reason: string;
}

// Filters
export interface ReviewFilters {
  page?: number;
  limit?: number;
  rating?: number;
  verifiedOnly?: boolean;
  sortBy?: 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful';
}

// Response types
export interface ReviewListResponse {
  reviews: ReviewForDisplay[];
  stats: ReviewStats;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateReviewResult {
  review: Review;
  ratingUpdated: boolean;
}
