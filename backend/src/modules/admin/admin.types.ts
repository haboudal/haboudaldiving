// Admin module types

// User roles enum
export type UserRole = 'diver' | 'instructor' | 'center_owner' | 'center_staff' | 'parent' | 'admin' | 'inspector';

// User status enum
export type UserStatus = 'pending_verification' | 'active' | 'suspended' | 'deactivated';

// Verification status enum
export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'expired';

// Review status
export type ReviewStatus = 'published' | 'hidden' | 'flagged' | 'removed';

// Moderation action
export type ModerationAction = 'approve' | 'hide' | 'remove';

// Dashboard statistics
export interface DashboardStats {
  users: {
    total: number;
    divers: number;
    instructors: number;
    centerOwners: number;
    pendingVerification: number;
    activeToday: number;
  };
  centers: {
    total: number;
    verified: number;
    pending: number;
    rejected: number;
  };
  certifications: {
    total: number;
    pending: number;
    verified: number;
  };
  trips: {
    total: number;
    upcoming: number;
    inProgress: number;
    completedThisMonth: number;
  };
  bookings: {
    total: number;
    thisMonth: number;
    revenue: number;
  };
  reviews: {
    total: number;
    flagged: number;
    averageRating: number;
  };
}

// Center with verification details
export interface CenterWithVerification {
  id: string;
  nameEn: string;
  nameAr: string | null;
  ownerUserId: string;
  ownerEmail: string;
  srsaLicenseNumber: string | null;
  licenseExpiryDate: string | null;
  licenseStatus: VerificationStatus;
  commercialRegistration: string | null;
  vatNumber: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string;
  documentsCount: number;
}

// Certification with user details
export interface CertificationWithUser {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  agency: string;
  certificationType: string;
  certificationNumber: string | null;
  certificationLevel: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  verificationStatus: VerificationStatus;
  documentUrl: string | null;
  createdAt: string;
}

// User details for admin
export interface UserWithDetails {
  id: string;
  email: string;
  phoneNumber: string | null;
  role: UserRole;
  status: UserStatus;
  preferredLanguage: string;
  emailVerifiedAt: string | null;
  phoneVerifiedAt: string | null;
  lastLoginAt: string | null;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  createdAt: string;
  updatedAt: string;
  profile: {
    firstNameEn: string | null;
    firstNameAr: string | null;
    lastNameEn: string | null;
    lastNameAr: string | null;
    dateOfBirth: string | null;
    nationality: string | null;
  } | null;
  certificationsCount: number;
  bookingsCount: number;
}

// Review with details
export interface ReviewWithDetails {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  bookingId: string | null;
  reviewableType: string;
  reviewableId: string;
  reviewableName: string;
  rating: number;
  title: string | null;
  content: string | null;
  isVerifiedBooking: boolean;
  helpfulCount: number;
  reportedCount: number;
  status: string;
  moderatedAt: string | null;
  moderatedBy: string | null;
  createdAt: string;
}

// Dive site for admin
export interface DiveSiteAdmin {
  id: string;
  srsaSiteCode: string;
  nameEn: string;
  nameAr: string | null;
  regionId: string | null;
  regionName: string | null;
  latitude: number;
  longitude: number;
  maxDepthMeters: number | null;
  minDepthMeters: number | null;
  minCertificationLevel: string | null;
  minLoggedDives: number;
  dailyDiverQuota: number | null;
  conservationZone: string;
  conservationFeeSar: number;
  marineProtectedArea: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Audit log entry
export interface AuditLogEntry {
  id: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  createdAt: string;
}

// DTOs
export interface VerifyCenterDto {
  status: 'verified' | 'rejected';
  notes?: string;
}

export interface VerifyCertificationDto {
  status: 'verified' | 'rejected';
  notes?: string;
}

export interface AdminUpdateUserDto {
  role?: UserRole;
  status?: UserStatus;
  notes?: string;
}

export interface DeactivateUserDto {
  reason: string;
}

export interface ModerateReviewDto {
  action: ModerationAction;
  reason?: string;
}

export interface UpdateSiteDto {
  nameEn?: string;
  nameAr?: string;
  maxDepthMeters?: number;
  minDepthMeters?: number;
  minCertificationLevel?: string;
  minLoggedDives?: number;
  dailyDiverQuota?: number;
  conservationZone?: 'zone_0' | 'zone_1' | 'zone_2' | 'zone_3';
  conservationFeeSar?: number;
  marineProtectedArea?: boolean;
  seasonalRestrictions?: Record<string, unknown>;
  hazards?: string[];
  features?: string[];
  marinLife?: string[];
}

// Filters
export interface PaginationFilters {
  page: number;
  limit: number;
}

export interface CenterFilters extends PaginationFilters {
  status?: VerificationStatus;
  search?: string;
}

export interface CertificationFilters extends PaginationFilters {
  status?: VerificationStatus;
  agency?: string;
}

export interface UserFilters extends PaginationFilters {
  role?: UserRole;
  status?: UserStatus;
  search?: string;
}

export interface ReviewFilters extends PaginationFilters {
  status?: string;
  minReports?: number;
}

export interface SiteFilters extends PaginationFilters {
  regionId?: string;
  isActive?: boolean;
  search?: string;
}

export interface AuditLogFilters extends PaginationFilters {
  userId?: string;
  action?: string;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
}
