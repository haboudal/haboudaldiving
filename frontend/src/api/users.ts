import { apiClient } from './client';
import type { ApiResponse, User, DiverProfile, Certification } from '@/types';

export interface UpdateProfileDto {
  phoneNumber?: string;
  preferredLanguage?: 'ar' | 'en';
}

export interface UpdateDiverProfileDto {
  firstNameEn?: string;
  firstNameAr?: string;
  lastNameEn?: string;
  lastNameAr?: string;
  dateOfBirth?: string;
  nationality?: string;
  experienceLevel?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  bioEn?: string;
  bioAr?: string;
}

export interface AddCertificationDto {
  agency: string;
  certificationType: string;
  certificationNumber?: string;
  certificationLevel?: string;
  issueDate?: string;
  expiryDate?: string;
}

export const usersApi = {
  getMe: async (): Promise<User> => {
    const { data } = await apiClient.get<ApiResponse<User>>('/users/me');
    return data.data;
  },

  updateMe: async (dto: UpdateProfileDto): Promise<User> => {
    const { data } = await apiClient.patch<ApiResponse<User>>('/users/me', dto);
    return data.data;
  },

  getDiverProfile: async (userId: string): Promise<DiverProfile> => {
    const { data } = await apiClient.get<ApiResponse<DiverProfile>>(`/divers/${userId}/profile`);
    return data.data;
  },

  updateDiverProfile: async (userId: string, dto: UpdateDiverProfileDto): Promise<DiverProfile> => {
    const { data } = await apiClient.patch<ApiResponse<DiverProfile>>(`/divers/${userId}/profile`, dto);
    return data.data;
  },

  getCertifications: async (userId: string): Promise<Certification[]> => {
    const { data } = await apiClient.get<ApiResponse<Certification[]>>(`/divers/${userId}/certifications`);
    return data.data;
  },

  addCertification: async (userId: string, dto: AddCertificationDto): Promise<Certification> => {
    const { data } = await apiClient.post<ApiResponse<Certification>>(`/divers/${userId}/certifications`, dto);
    return data.data;
  },
};
