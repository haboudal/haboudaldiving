// Dive Logs module types

// Dive types
export type DiveType = 'recreational' | 'training' | 'night' | 'deep' | 'drift' | 'wreck' | 'cave' | 'photography' | 'other';

// Entry types
export type EntryType = 'shore' | 'boat' | 'pier' | 'platform';

// Suit types
export type SuitType = 'none' | 'shorty' | 'wetsuit_3mm' | 'wetsuit_5mm' | 'wetsuit_7mm' | 'semi_dry' | 'dry_suit';

// Tank types
export type TankType = 'aluminum_80' | 'aluminum_63' | 'steel_80' | 'steel_100' | 'steel_120' | 'twinset' | 'sidemount';

// Gas mixtures
export type GasMixture = 'air' | 'nitrox_32' | 'nitrox_36' | 'trimix' | 'other';

// Current conditions
export type CurrentCondition = 'none' | 'light' | 'moderate' | 'strong' | 'variable';

// Weather conditions
export type WeatherCondition = 'sunny' | 'cloudy' | 'overcast' | 'rainy' | 'windy' | 'stormy';

// Base dive log interface
export interface DiveLog {
  id: string;
  userId: string;
  tripId: string | null;
  bookingId: string | null;
  siteId: string | null;
  diveNumber: number | null;
  diveDate: string;
  entryTime: string | null;
  exitTime: string | null;
  bottomTimeMinutes: number | null;
  maxDepthMeters: number | null;
  avgDepthMeters: number | null;
  waterTempC: number | null;
  visibilityMeters: number | null;
  weightKg: number | null;
  suitType: SuitType | null;
  tankType: TankType | null;
  tankSizeLiters: number | null;
  startPressureBar: number | null;
  endPressureBar: number | null;
  airConsumptionRate: number | null;
  gasMixture: GasMixture;
  diveType: DiveType | null;
  entryType: EntryType | null;
  currentConditions: CurrentCondition | null;
  weatherConditions: WeatherCondition | null;
  buddyName: string | null;
  buddyUserId: string | null;
  instructorId: string | null;
  notes: string | null;
  marineLifeSpotted: string[];
  photos: string[];
  computerData: Record<string, unknown> | null;
  isTrainingDive: boolean;
  signatureUrl: string | null;
  verifiedByInstructor: boolean;
  createdAt: string;
  updatedAt: string;
}

// Dive log with related details
export interface DiveLogWithDetails extends DiveLog {
  siteName: string | null;
  siteCode: string | null;
  buddyUserName: string | null;
  instructorName: string | null;
  tripTitle: string | null;
}

// Dive statistics
export interface DiveStatistics {
  totalDives: number;
  totalBottomTimeMinutes: number;
  deepestDiveMeters: number;
  avgDepthMeters: number;
  avgBottomTimeMinutes: number;
  totalSitesVisited: number;
  favoritesSite: { id: string; name: string; diveCount: number } | null;
  mostRecentDive: string | null;
  certificationDives: number;
  nightDives: number;
  deepDives: number;
  divesByMonth: { month: string; count: number }[];
  divesByYear: { year: number; count: number }[];
}

// DTOs
export interface CreateDiveLogDto {
  tripId?: string;
  bookingId?: string;
  siteId?: string;
  diveNumber?: number;
  diveDate: string;
  entryTime?: string;
  exitTime?: string;
  bottomTimeMinutes?: number;
  maxDepthMeters?: number;
  avgDepthMeters?: number;
  waterTempC?: number;
  visibilityMeters?: number;
  weightKg?: number;
  suitType?: SuitType;
  tankType?: TankType;
  tankSizeLiters?: number;
  startPressureBar?: number;
  endPressureBar?: number;
  gasMixture?: GasMixture;
  diveType?: DiveType;
  entryType?: EntryType;
  currentConditions?: CurrentCondition;
  weatherConditions?: WeatherCondition;
  buddyName?: string;
  buddyUserId?: string;
  instructorId?: string;
  notes?: string;
  marineLifeSpotted?: string[];
  photos?: string[];
  computerData?: Record<string, unknown>;
  isTrainingDive?: boolean;
}

export interface UpdateDiveLogDto {
  tripId?: string | null;
  bookingId?: string | null;
  siteId?: string | null;
  diveNumber?: number | null;
  diveDate?: string;
  entryTime?: string | null;
  exitTime?: string | null;
  bottomTimeMinutes?: number | null;
  maxDepthMeters?: number | null;
  avgDepthMeters?: number | null;
  waterTempC?: number | null;
  visibilityMeters?: number | null;
  weightKg?: number | null;
  suitType?: SuitType | null;
  tankType?: TankType | null;
  tankSizeLiters?: number | null;
  startPressureBar?: number | null;
  endPressureBar?: number | null;
  gasMixture?: GasMixture;
  diveType?: DiveType | null;
  entryType?: EntryType | null;
  currentConditions?: CurrentCondition | null;
  weatherConditions?: WeatherCondition | null;
  buddyName?: string | null;
  buddyUserId?: string | null;
  instructorId?: string | null;
  notes?: string | null;
  marineLifeSpotted?: string[];
  photos?: string[];
  computerData?: Record<string, unknown> | null;
  isTrainingDive?: boolean;
}

export interface VerifyDiveLogDto {
  signatureUrl?: string;
}

// Filters
export interface DiveLogFilters {
  page?: number;
  limit?: number;
  siteId?: string;
  diveType?: DiveType;
  dateFrom?: string;
  dateTo?: string;
  minDepth?: number;
  maxDepth?: number;
  verified?: boolean;
  sortBy?: 'date' | 'depth' | 'duration' | 'created';
  sortOrder?: 'asc' | 'desc';
}

// Import from computer data
export interface ImportComputerDataDto {
  computerBrand: string;
  computerModel?: string;
  dives: {
    diveDate: string;
    entryTime?: string;
    exitTime?: string;
    bottomTimeMinutes: number;
    maxDepthMeters: number;
    avgDepthMeters?: number;
    waterTempC?: number;
    startPressureBar?: number;
    endPressureBar?: number;
    gasMixture?: GasMixture;
    rawData?: Record<string, unknown>;
  }[];
}

// Response types
export interface DiveLogListResponse {
  diveLogs: DiveLogWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
