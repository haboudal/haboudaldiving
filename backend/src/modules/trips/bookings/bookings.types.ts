export type BookingStatus = 'pending' | 'confirmed' | 'paid' | 'checked_in' | 'completed' | 'cancelled' | 'refunded';

export interface EquipmentSizes {
  wetsuit?: string;
  bcd?: string;
  fins?: string;
  boots?: string;
  mask?: string;
}

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
  waiverSignedAt?: Date;
  waiverIpAddress?: string;
  parentConsentRequired: boolean;
  parentConsentGivenAt?: Date;
  parentConsentBy?: string;
  checkedInAt?: Date;
  checkedInBy?: string;
  cancellationReason?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  refundAmountSar?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingWithDetails extends Booking {
  tripTitle?: string;
  userName?: string;
  userEmail?: string;
  centerName?: string;
}

export interface WaitingListEntry {
  id: string;
  tripId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  position: number;
  notifiedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
}

export interface BookingPriceBreakdown {
  basePriceSar: number;
  equipmentRentalSar: number;
  conservationFeeSar: number;
  insuranceFeeSar: number;
  platformFeeSar: number;
  vatAmountSar: number;
  discountAmountSar: number;
  totalAmountSar: number;
}

export interface CreateBookingDto {
  numberOfDivers?: number;
  needsEquipment?: boolean;
  specialRequests?: string;
  dietaryRequirements?: string;
  equipmentSizes?: EquipmentSizes;
}

export interface UpdateBookingDto {
  specialRequests?: string;
  dietaryRequirements?: string;
  equipmentSizes?: EquipmentSizes;
}

export interface CancelBookingDto {
  reason: string;
}

export interface BookingFilters {
  status?: BookingStatus;
  page?: number;
  limit?: number;
}

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
}

export interface CreateBookingResult {
  booking?: Booking;
  waitingList?: boolean;
  position?: number;
  parentConsentRequired?: boolean;
}

export interface CancelBookingResult {
  refundAmount: number;
}
