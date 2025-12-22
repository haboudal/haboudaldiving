import { Request } from 'express';

// User roles
export type UserRole = 'diver' | 'instructor' | 'center_owner' | 'center_staff' | 'parent' | 'admin' | 'inspector';

// User status
export type UserStatus = 'pending_verification' | 'active' | 'suspended' | 'deactivated';

// JWT payload
export interface JwtPayload {
  userId: string;
  role: UserRole;
  email: string;
  isMinor?: boolean;
}

// Extended Express Request
export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

// Pagination
export interface PaginationQuery {
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Common entity fields
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// User base type
export interface User extends BaseEntity {
  email: string;
  phoneNumber?: string;
  role: UserRole;
  status: UserStatus;
  preferredLanguage: string;
  emailVerifiedAt?: Date;
  lastLoginAt?: Date;
}

// Diver profile
export interface DiverProfile extends BaseEntity {
  userId: string;
  firstNameEn?: string;
  firstNameAr?: string;
  lastNameEn?: string;
  lastNameAr?: string;
  dateOfBirth?: Date;
  nationality?: string;
  experienceLevel?: string;
  totalLoggedDives: number;
  isMinor: boolean;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

// Certification
export interface Certification extends BaseEntity {
  userId: string;
  agency: string;
  certificationType: string;
  certificationNumber?: string;
  certificationLevel?: string;
  issueDate?: Date;
  expiryDate?: Date;
  verificationStatus: 'pending' | 'verified' | 'rejected' | 'expired';
}

// Diving center
export interface DivingCenter extends BaseEntity {
  ownerUserId: string;
  nameEn: string;
  nameAr?: string;
  slug?: string;
  srsaLicenseNumber?: string;
  licenseExpiryDate?: Date;
  city?: string;
  latitude?: number;
  longitude?: number;
  phoneEmergency?: string;
  email?: string;
  status: UserStatus;
  ratingAverage: number;
  totalReviews: number;
}

// Vessel
export interface Vessel extends BaseEntity {
  centerId: string;
  name: string;
  registrationNumber?: string;
  vesselType: string;
  capacity: number;
  diverCapacity: number;
  status: UserStatus;
}

// Dive site
export interface DiveSite extends BaseEntity {
  srsaSiteCode: string;
  nameEn: string;
  nameAr?: string;
  latitude: number;
  longitude: number;
  maxDepthMeters?: number;
  dailyDiverQuota?: number;
  conservationZone: 'zone_0' | 'zone_1' | 'zone_2' | 'zone_3';
  conservationFeeSar: number;
  marineProtectedArea: boolean;
}

// SRSA Quota
export interface QuotaCheck {
  siteCode: string;
  date: string;
  numberOfDivers: number;
}

export interface QuotaCheckResult {
  siteCode: string;
  date: string;
  dailyLimit: number;
  used: number;
  remaining: number;
  available: boolean;
  nextAvailableSlot?: string;
}

export interface ConservationFee {
  siteCode: string;
  conservationZone: string;
  numberOfDivers: number;
  feePerDiver: number;
  totalFee: number;
  currency: string;
}
