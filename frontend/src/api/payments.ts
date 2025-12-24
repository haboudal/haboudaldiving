import { apiClient } from './client';
import type { ApiResponse, Payment, CheckoutRequest, CheckoutResponse } from '@/types';

export interface PaymentFilters {
  page?: number;
  limit?: number;
  status?: string;
}

export const paymentsApi = {
  checkout: async (request: CheckoutRequest): Promise<CheckoutResponse> => {
    const { data } = await apiClient.post<ApiResponse<CheckoutResponse>>('/payments/checkout', request);
    return data.data;
  },

  getStatus: async (checkoutId: string): Promise<Payment> => {
    const { data } = await apiClient.get<ApiResponse<Payment>>(`/payments/status/${checkoutId}`);
    return data.data;
  },

  getByBooking: async (bookingId: string): Promise<Payment[]> => {
    const { data } = await apiClient.get<ApiResponse<Payment[]>>(`/payments/booking/${bookingId}`);
    return data.data;
  },

  getMyPayments: async (filters?: PaymentFilters): Promise<{ payments: Payment[]; total: number }> => {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.status) params.append('status', filters.status);

    const { data } = await apiClient.get<ApiResponse<{ payments: Payment[]; total: number }>>(`/payments/my?${params}`);
    return data.data;
  },

  getById: async (id: string): Promise<Payment> => {
    const { data } = await apiClient.get<ApiResponse<Payment>>(`/payments/${id}`);
    return data.data;
  },
};
