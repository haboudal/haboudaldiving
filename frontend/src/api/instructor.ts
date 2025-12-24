import { apiClient } from './client';
import type {
  ApiResponse,
  Trip,
  DiveLog,
  Review,
} from '@/types';

// Instructor Dashboard Stats
export interface InstructorDashboardStats {
  upcomingTrips: number;
  completedTrips: number;
  totalDivesSupervised: number;
  pendingVerifications: number;
  averageRating: number;
  totalReviews: number;
}

// Instructor availability
export interface InstructorAvailability {
  id: string;
  instructorId: string;
  date: string;
  isAvailable: boolean;
  notes?: string;
}

// Trip assignment
export interface TripAssignment {
  id: string;
  tripId: string;
  instructorId: string;
  role: 'lead' | 'assistant';
  assignedAt: string;
  trip: Trip;
}

// Dive log for verification
export interface DiveLogForVerification extends DiveLog {
  diverName: string;
  diverEmail: string;
  siteName?: string;
}

export const instructorApi = {
  // Dashboard
  getDashboardStats: async (): Promise<InstructorDashboardStats> => {
    const { data } = await apiClient.get<ApiResponse<InstructorDashboardStats>>('/instructor/dashboard');
    return data.data;
  },

  // My Trips
  getMyTrips: async (filters: {
    status?: 'upcoming' | 'in_progress' | 'completed' | 'all';
    page?: number;
    limit?: number;
  } = {}): Promise<{ assignments: TripAssignment[]; total: number }> => {
    const { data } = await apiClient.get<ApiResponse<{ assignments: TripAssignment[]; total: number }>>(
      '/instructor/trips',
      { params: filters }
    );
    return data.data;
  },

  getTripDetails: async (tripId: string): Promise<TripAssignment> => {
    const { data } = await apiClient.get<ApiResponse<TripAssignment>>(`/instructor/trips/${tripId}`);
    return data.data;
  },

  // Availability/Schedule
  getAvailability: async (month: string): Promise<InstructorAvailability[]> => {
    const { data } = await apiClient.get<ApiResponse<InstructorAvailability[]>>(
      '/instructor/availability',
      { params: { month } }
    );
    return data.data;
  },

  setAvailability: async (dates: { date: string; isAvailable: boolean; notes?: string }[]): Promise<InstructorAvailability[]> => {
    const { data } = await apiClient.post<ApiResponse<InstructorAvailability[]>>(
      '/instructor/availability',
      { dates }
    );
    return data.data;
  },

  updateAvailability: async (date: string, isAvailable: boolean, notes?: string): Promise<InstructorAvailability> => {
    const { data } = await apiClient.patch<ApiResponse<InstructorAvailability>>(
      `/instructor/availability/${date}`,
      { isAvailable, notes }
    );
    return data.data;
  },

  // Dive Log Verification
  getPendingVerifications: async (page = 1, limit = 20): Promise<{
    diveLogs: DiveLogForVerification[];
    total: number
  }> => {
    const { data } = await apiClient.get<ApiResponse<{ diveLogs: DiveLogForVerification[]; total: number }>>(
      '/instructor/dive-logs/pending',
      { params: { page, limit } }
    );
    return data.data;
  },

  verifyDiveLog: async (diveLogId: string, notes?: string): Promise<DiveLog> => {
    const { data } = await apiClient.post<ApiResponse<DiveLog>>(
      `/dive-logs/${diveLogId}/verify`,
      { notes }
    );
    return data.data;
  },

  rejectDiveLog: async (diveLogId: string, reason: string): Promise<DiveLog> => {
    const { data } = await apiClient.post<ApiResponse<DiveLog>>(
      `/dive-logs/${diveLogId}/reject`,
      { reason }
    );
    return data.data;
  },

  // Reviews about the instructor
  getMyReviews: async (page = 1, limit = 20): Promise<{ reviews: Review[]; total: number; averageRating: number }> => {
    const { data } = await apiClient.get<ApiResponse<{ reviews: Review[]; total: number; averageRating: number }>>(
      '/instructor/reviews',
      { params: { page, limit } }
    );
    return data.data;
  },
};
