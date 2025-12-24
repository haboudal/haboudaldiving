// API Response types
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// User types
export type UserRole = 'diver' | 'instructor' | 'center_owner' | 'parent' | 'admin';
export type UserStatus = 'pending_verification' | 'active' | 'suspended' | 'deactivated';

export interface User {
  id: string;
  email: string;
  phoneNumber?: string;
  role: UserRole;
  status: UserStatus;
  preferredLanguage: 'ar' | 'en';
  createdAt: string;
  updatedAt: string;
}

export interface DiverProfile {
  id: string;
  userId: string;
  firstNameEn?: string;
  firstNameAr?: string;
  lastNameEn?: string;
  lastNameAr?: string;
  dateOfBirth?: string;
  nationality?: string;
  experienceLevel?: string;
  totalLoggedDives: number;
  deepestDiveMeters?: number;
  isMinor: boolean;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  profilePhotoUrl?: string;
  bioEn?: string;
  bioAr?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Certification {
  id: string;
  userId: string;
  agency: string;
  certificationType: string;
  certificationNumber?: string;
  certificationLevel?: string;
  issueDate?: string;
  expiryDate?: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  documentUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// Auth types
export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  dateOfBirth?: string;
  phoneNumber?: string;
  preferredLanguage?: 'ar' | 'en';
  parentEmail?: string;
}

export interface AuthResponse {
  user: User;
  tokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  accessToken?: string;
  expiresIn?: number;
}

// Trip types
export type TripStatus = 'draft' | 'published' | 'full' | 'in_progress' | 'completed' | 'cancelled';
export type TripType = 'morning' | 'afternoon' | 'full_day' | 'night' | 'multi_day' | 'liveaboard';

export interface Trip {
  id: string;
  centerId: string;
  vesselId?: string;
  siteId?: string;
  leadInstructorId?: string;
  titleEn: string;
  titleAr?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  tripType: TripType;
  departureDatetime: string;
  returnDatetime: string;
  meetingPointEn?: string;
  meetingPointAr?: string;
  meetingPointLatitude?: number;
  meetingPointLongitude?: number;
  maxParticipants: number;
  minParticipants: number;
  currentParticipants: number;
  minCertificationLevel?: string;
  minLoggedDives: number;
  minAge: number;
  maxAge?: number;
  numberOfDives: number;
  includesEquipment: boolean;
  includesMeals: boolean;
  includesRefreshments: boolean;
  pricePerPersonSar: number;
  equipmentRentalPriceSar?: number;
  conservationFeeIncluded: boolean;
  cancellationPolicy?: string;
  cancellationDeadlineHours: number;
  status: TripStatus;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Extended fields
  centerName?: string;
  siteName?: string;
  leadInstructorName?: string;
  vesselName?: string;
}

export interface TripFilters {
  centerId?: string;
  siteId?: string;
  status?: TripStatus;
  dateFrom?: string;
  dateTo?: string;
  tripType?: TripType;
  upcoming?: boolean;
  page?: number;
  limit?: number;
}

// Booking types
export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show';

export interface Booking {
  id: string;
  tripId: string;
  userId: string;
  bookedByUserId?: string;
  centerId: string;
  bookingNumber: string;
  status: BookingStatus;
  numberOfDivers: number;
  basePriceSar: number;
  equipmentRentalSar: number;
  conservationFeeSar: number;
  insuranceFeeSar: number;
  platformFeeSar: number;
  vatAmountSar: number;
  discountAmountSar: number;
  totalAmountSar: number;
  currency: string;
  specialRequests?: string;
  dietaryRequirements?: string;
  equipmentSizes?: EquipmentSizes;
  waiverSignedAt?: string;
  parentConsentRequired: boolean;
  parentConsentGivenAt?: string;
  checkedInAt?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
  // Extended fields
  tripTitle?: string;
  userName?: string;
  userEmail?: string;
  centerName?: string;
}

export interface EquipmentSizes {
  wetsuit?: string;
  bcd?: string;
  fins?: string;
  mask?: string;
}

export interface CreateBookingDto {
  participantCount: number;
  requiresEquipmentRental?: boolean;
  equipmentSizes?: EquipmentSizes;
  specialRequests?: string;
  dietaryRequirements?: string;
}

export interface PriceBreakdown {
  basePriceSar: number;
  equipmentRentalSar: number;
  conservationFeeSar: number;
  insuranceFeeSar: number;
  platformFeeSar: number;
  vatAmountSar: number;
  discountAmountSar: number;
  totalAmountSar: number;
}

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
}

// Diving Center types
export type CenterStatus = 'pending_verification' | 'active' | 'suspended' | 'deactivated';

export interface DivingCenter {
  id: string;
  ownerUserId: string;
  nameEn: string;
  nameAr?: string;
  slug: string;
  descriptionEn?: string;
  descriptionAr?: string;
  srsaLicenseNumber?: string;
  licenseExpiryDate?: string;
  city?: string;
  addressEn?: string;
  addressAr?: string;
  latitude?: number;
  longitude?: number;
  phoneEmergency?: string;
  email?: string;
  website?: string;
  status: CenterStatus;
  ratingAverage: number;
  totalReviews: number;
  createdAt: string;
  updatedAt: string;
}

// Review types
export interface Review {
  id: string;
  userId: string;
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
  helpfulCount: number;
  reportCount: number;
  status: 'pending' | 'approved' | 'rejected';
  centerResponseEn?: string;
  centerResponseAr?: string;
  createdAt: string;
  updatedAt: string;
  // Extended fields
  userName?: string;
  tripTitle?: string;
}

// Dive Log types
export interface DiveLog {
  id: string;
  usrId: string;
  tripId?: string;
  bookingId?: string;
  siteId?: string;
  diveNumber: number;
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
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiveStatistics {
  totalDives: number;
  totalBottomTime: number;
  deepestDive: number;
  averageDepth: number;
  divesThisYear: number;
  divesThisMonth: number;
}

// Payment types
export type PaymentMethod = 'MADA' | 'VISA' | 'MASTER' | 'APPLEPAY' | 'STC_PAY';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'partially_refunded';

export interface Payment {
  id: string;
  bookingId: string;
  userId: string;
  amountSar: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentGateway: string;
  gatewayTransactionId?: string;
  status: PaymentStatus;
  paidAt?: string;
  failedAt?: string;
  failureReason?: string;
  refundedAt?: string;
  refundAmountSar?: number;
  refundReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CheckoutRequest {
  bookingId: string;
  paymentMethod: PaymentMethod;
  returnUrl: string;
  cancelUrl?: string;
}

export interface CheckoutResponse {
  checkoutId: string;
  redirectUrl: string;
}

// Vessel types
export interface Vessel {
  id: string;
  centerId: string;
  nameEn: string;
  nameAr?: string;
  vesselType: string;
  registrationNumber?: string;
  capacity: number;
  manufacturerYear?: number;
  lengthMeters?: number;
  amenities?: string[];
  safetyEquipment?: string[];
  photoUrls?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVesselDto {
  nameEn: string;
  nameAr?: string;
  vesselType: string;
  registrationNumber?: string;
  capacity: number;
  manufacturerYear?: number;
  lengthMeters?: number;
  amenities?: string[];
  safetyEquipment?: string[];
}

// Center Staff types
export type StaffRole = 'manager' | 'instructor' | 'divemaster' | 'boat_captain' | 'crew' | 'admin';

export interface CenterStaff {
  id: string;
  centerId: string;
  userId: string;
  role: StaffRole;
  employeeNumber?: string;
  hireDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Extended
  userName?: string;
  userEmail?: string;
}

export interface AddStaffDto {
  email: string;
  role: StaffRole;
  employeeNumber?: string;
}

// Trip management types
export interface CreateTripDto {
  vesselId?: string;
  siteId?: string;
  leadInstructorId?: string;
  titleEn: string;
  titleAr?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  tripType: TripType;
  departureDatetime: string;
  returnDatetime: string;
  meetingPointEn?: string;
  meetingPointAr?: string;
  meetingPointLatitude?: number;
  meetingPointLongitude?: number;
  maxParticipants: number;
  minParticipants?: number;
  minCertificationLevel?: string;
  minLoggedDives?: number;
  minAge?: number;
  maxAge?: number;
  numberOfDives?: number;
  includesEquipment?: boolean;
  includesMeals?: boolean;
  includesRefreshments?: boolean;
  pricePerPersonSar: number;
  equipmentRentalPriceSar?: number;
  cancellationPolicy?: string;
  cancellationDeadlineHours?: number;
}

export interface UpdateTripDto extends Partial<CreateTripDto> {
  status?: TripStatus;
}

// Center Dashboard Stats
export interface CenterDashboardStats {
  totalTrips: number;
  activeTrips: number;
  totalBookings: number;
  pendingBookings: number;
  revenue: {
    thisMonth: number;
    lastMonth: number;
    total: number;
  };
  upcomingTrips: Trip[];
  recentBookings: Booking[];
  ratingAverage: number;
  totalReviews: number;
}

// Dive Site types
export interface DiveSite {
  id: string;
  regionId: string;
  nameEn: string;
  nameAr?: string;
  siteCode?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  latitude?: number;
  longitude?: number;
  maxDepthMeters?: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  marineLife?: string[];
  bestSeason?: string;
  conservationZone?: string;
  dailyDiverLimit?: number;
  createdAt: string;
  updatedAt: string;
}
