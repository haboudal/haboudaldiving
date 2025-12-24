import { apiClient } from './client';
import type {
  ApiResponse,
  User,
  UserRole,
  UserStatus,
  DivingCenter,
  CenterStatus,
  Trip,
  Booking,
  Review,
} from '@/types';

// Admin Dashboard Stats
export interface AdminDashboardStats {
  users: {
    total: number;
    active: number;
    pending: number;
    suspended: number;
    newThisMonth: number;
  };
  centers: {
    total: number;
    active: number;
    pending: number;
    suspended: number;
  };
  trips: {
    total: number;
    published: number;
    completed: number;
    cancelled: number;
  };
  bookings: {
    total: number;
    thisMonth: number;
    revenue: number;
    revenueThisMonth: number;
  };
  recentUsers: User[];
  recentCenters: DivingCenter[];
  pendingCenters: DivingCenter[];
}

// User filters
export interface UserFilters {
  role?: UserRole;
  status?: UserStatus;
  search?: string;
  page?: number;
  limit?: number;
}

// Center filters
export interface CenterFilters {
  status?: CenterStatus;
  city?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const adminApi = {
  // Dashboard
  getDashboardStats: async (): Promise<AdminDashboardStats> => {
    const { data } = await apiClient.get<ApiResponse<AdminDashboardStats>>('/admin/dashboard');
    return data.data;
  },

  // User Management
  getUsers: async (filters: UserFilters = {}): Promise<{ users: User[]; total: number }> => {
    const { data } = await apiClient.get<ApiResponse<{ users: User[]; total: number }>>(
      '/admin/users',
      { params: filters }
    );
    return data.data;
  },

  getUserById: async (userId: string): Promise<User> => {
    const { data } = await apiClient.get<ApiResponse<User>>(`/admin/users/${userId}`);
    return data.data;
  },

  updateUser: async (userId: string, updates: { role?: UserRole; status?: UserStatus }): Promise<User> => {
    const { data } = await apiClient.patch<ApiResponse<User>>(`/admin/users/${userId}`, updates);
    return data.data;
  },

  suspendUser: async (userId: string, reason: string): Promise<User> => {
    const { data } = await apiClient.post<ApiResponse<User>>(`/admin/users/${userId}/suspend`, { reason });
    return data.data;
  },

  activateUser: async (userId: string): Promise<User> => {
    const { data } = await apiClient.post<ApiResponse<User>>(`/admin/users/${userId}/activate`);
    return data.data;
  },

  // Center Management
  getCenters: async (filters: CenterFilters = {}): Promise<{ centers: DivingCenter[]; total: number }> => {
    const { data } = await apiClient.get<ApiResponse<{ centers: DivingCenter[]; total: number }>>(
      '/admin/centers',
      { params: filters }
    );
    return data.data;
  },

  getCenterById: async (centerId: string): Promise<DivingCenter> => {
    const { data } = await apiClient.get<ApiResponse<DivingCenter>>(`/admin/centers/${centerId}`);
    return data.data;
  },

  approveCenter: async (centerId: string): Promise<DivingCenter> => {
    const { data } = await apiClient.post<ApiResponse<DivingCenter>>(`/admin/centers/${centerId}/approve`);
    return data.data;
  },

  rejectCenter: async (centerId: string, reason: string): Promise<DivingCenter> => {
    const { data } = await apiClient.post<ApiResponse<DivingCenter>>(
      `/admin/centers/${centerId}/reject`,
      { reason }
    );
    return data.data;
  },

  suspendCenter: async (centerId: string, reason: string): Promise<DivingCenter> => {
    const { data } = await apiClient.post<ApiResponse<DivingCenter>>(
      `/admin/centers/${centerId}/suspend`,
      { reason }
    );
    return data.data;
  },

  activateCenter: async (centerId: string): Promise<DivingCenter> => {
    const { data } = await apiClient.post<ApiResponse<DivingCenter>>(`/admin/centers/${centerId}/activate`);
    return data.data;
  },

  // Analytics
  getAnalytics: async (period: 'week' | 'month' | 'year' = 'month'): Promise<{
    userGrowth: { date: string; count: number }[];
    bookingTrend: { date: string; count: number; revenue: number }[];
    topCenters: { centerId: string; centerName: string; bookings: number; revenue: number }[];
    topSites: { siteId: string; siteName: string; visits: number }[];
    revenueByMonth: { month: string; revenue: number }[];
  }> => {
    const { data } = await apiClient.get<ApiResponse<{
      userGrowth: { date: string; count: number }[];
      bookingTrend: { date: string; count: number; revenue: number }[];
      topCenters: { centerId: string; centerName: string; bookings: number; revenue: number }[];
      topSites: { siteId: string; siteName: string; visits: number }[];
      revenueByMonth: { month: string; revenue: number }[];
    }>>('/admin/analytics', { params: { period } });
    return data.data;
  },

  // Moderation
  getFlaggedReviews: async (page = 1, limit = 20): Promise<{ reviews: Review[]; total: number }> => {
    const { data } = await apiClient.get<ApiResponse<{ reviews: Review[]; total: number }>>(
      '/admin/moderation/reviews',
      { params: { page, limit, status: 'flagged' } }
    );
    return data.data;
  },

  approveReview: async (reviewId: string): Promise<Review> => {
    const { data } = await apiClient.post<ApiResponse<Review>>(`/admin/moderation/reviews/${reviewId}/approve`);
    return data.data;
  },

  rejectReview: async (reviewId: string, reason: string): Promise<Review> => {
    const { data } = await apiClient.post<ApiResponse<Review>>(
      `/admin/moderation/reviews/${reviewId}/reject`,
      { reason }
    );
    return data.data;
  },

  // Trips oversight
  getAllTrips: async (filters: { status?: string; centerId?: string; page?: number; limit?: number } = {}): Promise<{
    trips: Trip[];
    total: number;
  }> => {
    const { data } = await apiClient.get<ApiResponse<{ trips: Trip[]; total: number }>>(
      '/admin/trips',
      { params: filters }
    );
    return data.data;
  },

  // Bookings oversight
  getAllBookings: async (filters: { status?: string; page?: number; limit?: number } = {}): Promise<{
    bookings: Booking[];
    total: number;
  }> => {
    const { data } = await apiClient.get<ApiResponse<{ bookings: Booking[]; total: number }>>(
      '/admin/bookings',
      { params: filters }
    );
    return data.data;
  },
};
