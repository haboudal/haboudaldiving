import { apiClient } from './client';
import type {
  ApiResponse,
  DivingCenter,
  Trip,
  TripFilters,
  Booking,
  Vessel,
  CreateVesselDto,
  CenterStaff,
  AddStaffDto,
  CreateTripDto,
  UpdateTripDto,
  Review,
  DiveSite,
} from '@/types';

// Public center endpoints
export const centersApi = {
  list: async (filters: { city?: string; status?: string; page?: number; limit?: number } = {}): Promise<{
    centers: DivingCenter[];
    total: number;
  }> => {
    const { data } = await apiClient.get<ApiResponse<{ centers: DivingCenter[]; total: number }>>(
      '/centers',
      { params: filters }
    );
    return data.data;
  },

  getById: async (id: string): Promise<DivingCenter> => {
    const { data } = await apiClient.get<ApiResponse<DivingCenter>>(`/centers/${id}`);
    return data.data;
  },

  getTrips: async (centerId: string, filters: TripFilters = {}): Promise<{ trips: Trip[]; total: number }> => {
    const { data } = await apiClient.get<ApiResponse<{ trips: Trip[]; total: number }>>(
      `/trips`,
      { params: { ...filters, centerId } }
    );
    return data.data;
  },

  getReviews: async (centerId: string, page = 1, limit = 10): Promise<{
    reviews: Review[];
    total: number;
    stats: { average: number; total: number; breakdown: Record<number, number> };
  }> => {
    const { data } = await apiClient.get<ApiResponse<{
      reviews: Review[];
      total: number;
      stats: { average: number; total: number; breakdown: Record<number, number> };
    }>>(`/reviews/centers/${centerId}`, { params: { page, limit } });
    return data.data;
  },
};

// Center owner management endpoints
export const centerOwnerApi = {
  // Get my center (for center owners)
  getMyCenter: async (): Promise<DivingCenter> => {
    const { data } = await apiClient.get<ApiResponse<DivingCenter>>('/centers/my');
    return data.data;
  },

  // Update center profile
  updateCenter: async (centerId: string, updates: Partial<DivingCenter>): Promise<DivingCenter> => {
    const { data } = await apiClient.patch<ApiResponse<DivingCenter>>(`/centers/${centerId}`, updates);
    return data.data;
  },

  // Dashboard stats
  getDashboardStats: async (centerId: string): Promise<{
    totalTrips: number;
    activeTrips: number;
    totalBookings: number;
    pendingBookings: number;
    revenue: { thisMonth: number; lastMonth: number; total: number };
    upcomingTrips: Trip[];
    recentBookings: Booking[];
  }> => {
    const { data } = await apiClient.get<ApiResponse<{
      totalTrips: number;
      activeTrips: number;
      totalBookings: number;
      pendingBookings: number;
      revenue: { thisMonth: number; lastMonth: number; total: number };
      upcomingTrips: Trip[];
      recentBookings: Booking[];
    }>>(`/centers/${centerId}/dashboard`);
    return data.data;
  },

  // Trip management
  getTrips: async (centerId: string, filters: TripFilters = {}): Promise<{ trips: Trip[]; total: number }> => {
    const { data } = await apiClient.get<ApiResponse<{ trips: Trip[]; total: number }>>(
      `/trips`,
      { params: { ...filters, centerId } }
    );
    return data.data;
  },

  createTrip: async (centerId: string, tripData: CreateTripDto): Promise<Trip> => {
    const { data } = await apiClient.post<ApiResponse<Trip>>(`/trips/center/${centerId}`, tripData);
    return data.data;
  },

  updateTrip: async (tripId: string, updates: UpdateTripDto): Promise<Trip> => {
    const { data } = await apiClient.patch<ApiResponse<Trip>>(`/trips/${tripId}`, updates);
    return data.data;
  },

  deleteTrip: async (tripId: string): Promise<void> => {
    await apiClient.delete(`/trips/${tripId}`);
  },

  publishTrip: async (tripId: string): Promise<Trip> => {
    const { data } = await apiClient.post<ApiResponse<Trip>>(`/trips/${tripId}/publish`);
    return data.data;
  },

  cancelTrip: async (tripId: string, reason: string): Promise<Trip> => {
    const { data } = await apiClient.post<ApiResponse<Trip>>(`/trips/${tripId}/cancel`, { reason });
    return data.data;
  },

  // Booking management
  getTripBookings: async (tripId: string, filters: { status?: string; page?: number; limit?: number } = {}): Promise<{
    bookings: Booking[];
    total: number;
  }> => {
    const { data } = await apiClient.get<ApiResponse<{ bookings: Booking[]; total: number }>>(
      `/trips/${tripId}/bookings`,
      { params: filters }
    );
    return data.data;
  },

  getCenterBookings: async (centerId: string, filters: { status?: string; tripId?: string; page?: number; limit?: number } = {}): Promise<{
    bookings: Booking[];
    total: number;
  }> => {
    const { data } = await apiClient.get<ApiResponse<{ bookings: Booking[]; total: number }>>(
      `/centers/${centerId}/bookings`,
      { params: filters }
    );
    return data.data;
  },

  checkInBooking: async (bookingId: string): Promise<Booking> => {
    const { data } = await apiClient.post<ApiResponse<Booking>>(`/trips/bookings/${bookingId}/check-in`);
    return data.data;
  },

  // Vessel management
  getVessels: async (centerId: string): Promise<Vessel[]> => {
    const { data } = await apiClient.get<ApiResponse<Vessel[]>>(`/centers/${centerId}/vessels`);
    return data.data;
  },

  createVessel: async (centerId: string, vesselData: CreateVesselDto): Promise<Vessel> => {
    const { data } = await apiClient.post<ApiResponse<Vessel>>(`/centers/${centerId}/vessels`, vesselData);
    return data.data;
  },

  updateVessel: async (centerId: string, vesselId: string, updates: Partial<CreateVesselDto>): Promise<Vessel> => {
    const { data } = await apiClient.patch<ApiResponse<Vessel>>(`/centers/${centerId}/vessels/${vesselId}`, updates);
    return data.data;
  },

  deleteVessel: async (centerId: string, vesselId: string): Promise<void> => {
    await apiClient.delete(`/centers/${centerId}/vessels/${vesselId}`);
  },

  // Staff management
  getStaff: async (centerId: string): Promise<CenterStaff[]> => {
    const { data } = await apiClient.get<ApiResponse<CenterStaff[]>>(`/centers/${centerId}/staff`);
    return data.data;
  },

  addStaff: async (centerId: string, staffData: AddStaffDto): Promise<CenterStaff> => {
    const { data } = await apiClient.post<ApiResponse<CenterStaff>>(`/centers/${centerId}/staff`, staffData);
    return data.data;
  },

  updateStaff: async (centerId: string, staffId: string, updates: Partial<AddStaffDto>): Promise<CenterStaff> => {
    const { data } = await apiClient.patch<ApiResponse<CenterStaff>>(`/centers/${centerId}/staff/${staffId}`, updates);
    return data.data;
  },

  removeStaff: async (centerId: string, staffId: string): Promise<void> => {
    await apiClient.delete(`/centers/${centerId}/staff/${staffId}`);
  },

  // Review response
  respondToReview: async (centerId: string, reviewId: string, responseEn: string, responseAr?: string): Promise<Review> => {
    const { data } = await apiClient.post<ApiResponse<Review>>(
      `/reviews/centers/${centerId}/reviews/${reviewId}/respond`,
      { responseEn, responseAr }
    );
    return data.data;
  },

  // Get instructors for trip assignment
  getInstructors: async (centerId: string): Promise<CenterStaff[]> => {
    const { data } = await apiClient.get<ApiResponse<CenterStaff[]>>(`/centers/${centerId}/staff`, {
      params: { role: 'instructor' }
    });
    return data.data;
  },
};

// Dive sites (public)
export const diveSitesApi = {
  list: async (filters: { regionId?: string; difficulty?: string } = {}): Promise<DiveSite[]> => {
    const { data } = await apiClient.get<ApiResponse<DiveSite[]>>('/sites', { params: filters });
    return data.data;
  },

  getById: async (id: string): Promise<DiveSite> => {
    const { data } = await apiClient.get<ApiResponse<DiveSite>>(`/sites/${id}`);
    return data.data;
  },
};
