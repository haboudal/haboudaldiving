export type TripStatus = 'draft' | 'published' | 'full' | 'in_progress' | 'completed' | 'cancelled';
export type TripType = 'morning' | 'afternoon' | 'full_day' | 'night' | 'multi_day' | 'liveaboard';
export type InstructorRole = 'lead' | 'assistant' | 'divemaster';

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
  departureDatetime: Date;
  returnDatetime: Date;
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
  quotaReservationId?: string;
  status: TripStatus;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TripWithDetails extends Trip {
  centerName?: string;
  siteName?: string;
  leadInstructorName?: string;
  vesselName?: string;
}

export interface TripInstructor {
  id: string;
  tripId: string;
  instructorId: string;
  instructorName?: string;
  role: InstructorRole;
  createdAt: Date;
}

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
  conservationFeeIncluded?: boolean;
  cancellationPolicy?: string;
  cancellationDeadlineHours?: number;
  reserveQuota?: boolean;
}

export interface UpdateTripDto extends Partial<CreateTripDto> {}

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

export interface AddInstructorDto {
  instructorId: string;
  role?: InstructorRole;
}
