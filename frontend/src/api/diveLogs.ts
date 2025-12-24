import { apiClient } from './client';
import type { ApiResponse, PaginatedResponse, DiveLog, DiveStatistics } from '@/types';

export interface DiveLogFilters {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  siteId?: string;
  verified?: boolean;
}

export interface CreateDiveLogDto {
  tripId?: string;
  bookingId?: string;
  siteId?: string;
  diveDate: string;
  diveType?: string;
  maxDepthMeters?: number;
  bottomTimeMinutes?: number;
  surfaceIntervalMinutes?: number;
  entryType?: string;
  waterType?: string;
  waterBodyType?: string;
  visibility?: string;
  waterTemperatureCelsius?: number;
  airTemperatureCelsius?: number;
  weightUsedKg?: number;
  suitType?: string;
  tankType?: string;
  startPressureBar?: number;
  endPressureBar?: number;
  nitroxPercentage?: number;
  notesEn?: string;
  notesAr?: string;
}

export const diveLogsApi = {
  getMyLogs: async (filters?: DiveLogFilters): Promise<PaginatedResponse<DiveLog>> => {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.siteId) params.append('siteId', filters.siteId);
    if (filters?.verified !== undefined) params.append('verified', String(filters.verified));

    const { data } = await apiClient.get<PaginatedResponse<DiveLog>>(`/dive-logs?${params}`);
    return data;
  },

  getStatistics: async (): Promise<DiveStatistics> => {
    const { data } = await apiClient.get<ApiResponse<DiveStatistics>>('/dive-logs/statistics');
    return data.data;
  },

  getById: async (id: string): Promise<DiveLog> => {
    const { data } = await apiClient.get<ApiResponse<DiveLog>>(`/dive-logs/${id}`);
    return data.data;
  },

  create: async (dto: CreateDiveLogDto): Promise<DiveLog> => {
    const { data } = await apiClient.post<ApiResponse<DiveLog>>('/dive-logs', dto);
    return data.data;
  },

  update: async (id: string, dto: Partial<CreateDiveLogDto>): Promise<DiveLog> => {
    const { data } = await apiClient.patch<ApiResponse<DiveLog>>(`/dive-logs/${id}`, dto);
    return data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/dive-logs/${id}`);
  },
};
