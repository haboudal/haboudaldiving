import { apiClient } from './client';
import type {
  ApiResponse,
  Trip,
  TripFilters,
  Booking,
  CreateBookingDto,
  PriceBreakdown,
  EligibilityResult,
} from '@/types';

export const tripsApi = {
  list: async (filters: TripFilters = {}): Promise<{ trips: Trip[]; total: number }> => {
    const { data } = await apiClient.get<ApiResponse<{ trips: Trip[]; total: number }>>('/trips', {
      params: filters,
    });
    return data.data;
  },

  getById: async (id: string): Promise<Trip> => {
    const { data } = await apiClient.get<ApiResponse<Trip>>(`/trips/${id}`);
    return data.data;
  },

  checkEligibility: async (tripId: string): Promise<EligibilityResult> => {
    const { data } = await apiClient.get<ApiResponse<EligibilityResult>>(
      `/trips/${tripId}/eligibility`
    );
    return data.data;
  },

  calculatePrice: async (tripId: string, dto: CreateBookingDto): Promise<PriceBreakdown> => {
    const { data } = await apiClient.post<ApiResponse<PriceBreakdown>>(
      `/trips/${tripId}/price`,
      dto
    );
    return data.data;
  },

  createBooking: async (tripId: string, dto: CreateBookingDto): Promise<Booking> => {
    const { data } = await apiClient.post<ApiResponse<Booking>>(`/trips/${tripId}/bookings`, dto);
    return data.data;
  },

  joinWaitlist: async (tripId: string): Promise<{ position: number }> => {
    const { data } = await apiClient.post<ApiResponse<{ position: number }>>(
      `/trips/${tripId}/waitlist`
    );
    return data.data;
  },

  leaveWaitlist: async (tripId: string): Promise<void> => {
    await apiClient.delete(`/trips/${tripId}/waitlist`);
  },
};

export const bookingsApi = {
  getMy: async (filters: { status?: string; page?: number; limit?: number } = {}): Promise<{
    bookings: Booking[];
    total: number;
  }> => {
    const { data } = await apiClient.get<ApiResponse<{ bookings: Booking[]; total: number }>>(
      '/trips/bookings/my',
      { params: filters }
    );
    return data.data;
  },

  getById: async (id: string): Promise<Booking> => {
    const { data } = await apiClient.get<ApiResponse<Booking>>(`/trips/bookings/${id}`);
    return data.data;
  },

  cancel: async (id: string, reason?: string): Promise<{ refundAmount: number }> => {
    const { data } = await apiClient.post<ApiResponse<{ refundAmount: number }>>(
      `/trips/bookings/${id}/cancel`,
      { reason }
    );
    return data.data;
  },

  signWaiver: async (id: string): Promise<void> => {
    await apiClient.post(`/trips/bookings/${id}/waiver`);
  },
};
