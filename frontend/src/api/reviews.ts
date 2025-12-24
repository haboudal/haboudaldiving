import { apiClient } from './client';
import type { ApiResponse, Review } from '@/types';

export interface ReviewFilters {
  page?: number;
  limit?: number;
  sortBy?: 'recent' | 'rating_high' | 'rating_low' | 'helpful';
}

export interface CreateReviewDto {
  bookingId: string;
  centerId: string;
  instructorId?: string;
  overallRating: number;
  safetyRating?: number;
  equipmentRating?: number;
  instructorRating?: number;
  valueRating?: number;
  titleEn?: string;
  titleAr?: string;
  reviewTextEn?: string;
  reviewTextAr?: string;
  wouldRecommend: boolean;
}

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
  wouldRecommendPercentage: number;
}

export interface CenterReviewsResponse {
  reviews: Review[];
  stats: ReviewStats;
  total: number;
  page: number;
  totalPages: number;
}

export const reviewsApi = {
  getCenterReviews: async (centerId: string, filters?: ReviewFilters): Promise<CenterReviewsResponse> => {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);

    const { data } = await apiClient.get<ApiResponse<CenterReviewsResponse>>(`/reviews/centers/${centerId}?${params}`);
    return data.data;
  },

  getMyReviews: async (): Promise<Review[]> => {
    const { data } = await apiClient.get<ApiResponse<Review[]>>('/reviews/my/list');
    return data.data;
  },

  getPendingReviews: async (): Promise<{ bookingId: string; tripTitle: string; centerName: string; completedAt: string }[]> => {
    const { data } = await apiClient.get<ApiResponse<{ bookingId: string; tripTitle: string; centerName: string; completedAt: string }[]>>('/reviews/my/pending');
    return data.data;
  },

  create: async (dto: CreateReviewDto): Promise<Review> => {
    const { data } = await apiClient.post<ApiResponse<Review>>('/reviews', dto);
    return data.data;
  },

  update: async (id: string, dto: Partial<CreateReviewDto>): Promise<Review> => {
    const { data } = await apiClient.patch<ApiResponse<Review>>(`/reviews/${id}`, dto);
    return data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/reviews/${id}`);
  },

  markHelpful: async (id: string): Promise<void> => {
    await apiClient.post(`/reviews/${id}/helpful`);
  },

  report: async (id: string, reason: string): Promise<void> => {
    await apiClient.post(`/reviews/${id}/report`, { reason });
  },
};
