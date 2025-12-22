-- Saudi Arabia Recreational Diving Platform
-- Complete PostgreSQL Schema v1.0.0
-- Supports: Users, Centers, Trips, Bookings, SRSA Compliance, Safety

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE user_role AS ENUM (
    'diver', 'instructor', 'center_owner', 'center_staff', 'parent', 'admin', 'inspector'
);

CREATE TYPE user_status AS ENUM (
    'pending_verification', 'active', 'suspended', 'deactivated'
);

CREATE TYPE verification_status AS ENUM (
    'pending', 'verified', 'rejected', 'expired'
);

CREATE TYPE booking_status AS ENUM (
    'pending', 'confirmed', 'paid', 'checked_in', 'completed', 'cancelled', 'refunded'
);

CREATE TYPE payment_status AS ENUM (
    'pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded'
);

CREATE TYPE trip_status AS ENUM (
    'draft', 'published', 'full', 'in_progress', 'completed', 'cancelled'
);

CREATE TYPE permit_status AS ENUM (
    'pending', 'approved', 'rejected', 'cancelled', 'expired'
);

CREATE TYPE incident_severity AS ENUM (
    'minor', 'moderate', 'serious', 'critical', 'fatal'
);

CREATE TYPE conservation_zone AS ENUM (
    'zone_0', 'zone_1', 'zone_2', 'zone_3'
);

-- ============================================================================
-- CORE USER TABLES
-- ============================================================================

-- Base users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'diver',
    status user_status NOT NULL DEFAULT 'pending_verification',
    preferred_language VARCHAR(10) NOT NULL DEFAULT 'ar',
    email_verified_at TIMESTAMPTZ,
    phone_verified_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- Diver profiles
CREATE TABLE diver_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_name_en VARCHAR(100),
    first_name_ar VARCHAR(100),
    last_name_en VARCHAR(100),
    last_name_ar VARCHAR(100),
    date_of_birth DATE,
    nationality VARCHAR(100),
    national_id_encrypted BYTEA,
    iqama_number_encrypted BYTEA,
    experience_level VARCHAR(50),
    total_logged_dives INTEGER DEFAULT 0,
    deepest_dive_meters INTEGER,
    is_minor BOOLEAN DEFAULT FALSE,
    medical_clearance_status VARCHAR(50) DEFAULT 'not_required',
    medical_clearance_expires DATE,
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relationship VARCHAR(50),
    profile_photo_url VARCHAR(500),
    bio_en TEXT,
    bio_ar TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_diver_profiles_user_id ON diver_profiles(user_id);
CREATE INDEX idx_diver_profiles_is_minor ON diver_profiles(is_minor);

-- Instructor profiles
CREATE TABLE instructor_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    instructor_number VARCHAR(100),
    certification_agency VARCHAR(100) NOT NULL,
    instructor_level VARCHAR(100) NOT NULL,
    specialties JSONB DEFAULT '[]',
    languages_spoken TEXT[] DEFAULT ARRAY['ar'],
    years_experience INTEGER DEFAULT 0,
    insurance_provider VARCHAR(200),
    insurance_policy_number VARCHAR(100),
    insurance_expiry DATE,
    is_independent BOOLEAN DEFAULT FALSE,
    bio_en TEXT,
    bio_ar TEXT,
    hourly_rate_sar DECIMAL(10,2),
    daily_rate_sar DECIMAL(10,2),
    availability_calendar JSONB,
    rating_average DECIMAL(3,2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    total_students_taught INTEGER DEFAULT 0,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_instructor_profiles_user_id ON instructor_profiles(user_id);
CREATE INDEX idx_instructor_profiles_agency ON instructor_profiles(certification_agency);
CREATE INDEX idx_instructor_profiles_independent ON instructor_profiles(is_independent);

-- Parent/Guardian links for minors
CREATE TABLE parent_guardian_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    minor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relationship VARCHAR(50) NOT NULL,
    consent_given_at TIMESTAMPTZ,
    consent_document_url VARCHAR(500),
    consent_ip_address INET,
    is_primary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(parent_user_id, minor_user_id)
);

CREATE INDEX idx_parent_guardian_parent ON parent_guardian_links(parent_user_id);
CREATE INDEX idx_parent_guardian_minor ON parent_guardian_links(minor_user_id);

-- Certifications (PADI, SSI, CMAS, etc.)
CREATE TABLE certifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agency VARCHAR(100) NOT NULL,
    certification_type VARCHAR(100) NOT NULL,
    certification_number VARCHAR(100),
    certification_level VARCHAR(100),
    issue_date DATE,
    expiry_date DATE,
    verification_status verification_status DEFAULT 'pending',
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    document_url VARCHAR(500),
    document_hash VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_certifications_user_id ON certifications(user_id);
CREATE INDEX idx_certifications_agency ON certifications(agency);
CREATE INDEX idx_certifications_status ON certifications(verification_status);

-- Specialty certifications (Nitrox, Deep, Rescue, etc.)
CREATE TABLE specialty_certifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    specialty_type VARCHAR(100) NOT NULL,
    agency VARCHAR(100),
    issue_date DATE,
    expiry_date DATE,
    document_url VARCHAR(500),
    verification_status verification_status DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_specialty_certs_user_id ON specialty_certifications(user_id);

-- ============================================================================
-- DIVING CENTER TABLES
-- ============================================================================

-- Regions and administrative areas
CREATE TABLE regions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    parent_region_id UUID REFERENCES regions(id),
    region_type VARCHAR(50),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_regions_code ON regions(code);
CREATE INDEX idx_regions_parent ON regions(parent_region_id);

-- Diving centers
CREATE TABLE diving_centers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_user_id UUID NOT NULL REFERENCES users(id),
    name_en VARCHAR(200) NOT NULL,
    name_ar VARCHAR(200),
    slug VARCHAR(200) UNIQUE,
    description_en TEXT,
    description_ar TEXT,
    srsa_license_number VARCHAR(100) UNIQUE,
    license_expiry_date DATE,
    license_status verification_status DEFAULT 'pending',
    commercial_registration VARCHAR(100),
    vat_number VARCHAR(50),
    address_en TEXT,
    address_ar TEXT,
    city VARCHAR(100),
    region_id UUID REFERENCES regions(id),
    postal_code VARCHAR(20),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    phone_primary VARCHAR(20),
    phone_secondary VARCHAR(20),
    phone_emergency VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(500),
    services_offered JSONB DEFAULT '[]',
    equipment_rental_available BOOLEAN DEFAULT FALSE,
    equipment_for_sale BOOLEAN DEFAULT FALSE,
    training_offered BOOLEAN DEFAULT FALSE,
    insurance_provider VARCHAR(200),
    insurance_policy_number VARCHAR(100),
    insurance_expiry DATE,
    operating_hours JSONB,
    capacity_per_day INTEGER,
    minimum_age INTEGER DEFAULT 10,
    logo_url VARCHAR(500),
    cover_photo_url VARCHAR(500),
    gallery_urls JSONB DEFAULT '[]',
    rating_average DECIMAL(3,2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    total_trips INTEGER DEFAULT 0,
    status user_status DEFAULT 'pending_verification',
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES users(id),
    featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_centers_owner ON diving_centers(owner_user_id);
CREATE INDEX idx_centers_slug ON diving_centers(slug);
CREATE INDEX idx_centers_city ON diving_centers(city);
CREATE INDEX idx_centers_region ON diving_centers(region_id);
CREATE INDEX idx_centers_status ON diving_centers(status);
CREATE INDEX idx_centers_srsa ON diving_centers(srsa_license_number);

-- Center staff assignments
CREATE TABLE center_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    center_id UUID NOT NULL REFERENCES diving_centers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    title_en VARCHAR(100),
    title_ar VARCHAR(100),
    permissions JSONB DEFAULT '[]',
    employment_type VARCHAR(50),
    hired_at DATE,
    terminated_at DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(center_id, user_id)
);

CREATE INDEX idx_center_staff_center ON center_staff(center_id);
CREATE INDEX idx_center_staff_user ON center_staff(user_id);
CREATE INDEX idx_center_staff_active ON center_staff(is_active);

-- Vessels (boats, liveaboards)
CREATE TABLE vessels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    center_id UUID NOT NULL REFERENCES diving_centers(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    name_ar VARCHAR(200),
    registration_number VARCHAR(100),
    vessel_type VARCHAR(50) NOT NULL,
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    year_built INTEGER,
    length_meters DECIMAL(5,2),
    capacity INTEGER NOT NULL,
    diver_capacity INTEGER NOT NULL,
    crew_capacity INTEGER,
    cabins INTEGER,
    bathrooms INTEGER,
    equipment_storage JSONB,
    safety_equipment JSONB DEFAULT '[]',
    navigation_equipment JSONB DEFAULT '[]',
    amenities JSONB DEFAULT '[]',
    last_inspection_date DATE,
    next_inspection_due DATE,
    insurance_provider VARCHAR(200),
    insurance_policy_number VARCHAR(100),
    insurance_expiry DATE,
    gps_tracker_id VARCHAR(100),
    photos JSONB DEFAULT '[]',
    status user_status DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vessels_center ON vessels(center_id);
CREATE INDEX idx_vessels_type ON vessels(vessel_type);
CREATE INDEX idx_vessels_status ON vessels(status);

-- ============================================================================
-- DIVE SITES & SRSA COMPLIANCE
-- ============================================================================

-- Dive sites
CREATE TABLE dive_sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    srsa_site_code VARCHAR(50) UNIQUE NOT NULL,
    name_en VARCHAR(200) NOT NULL,
    name_ar VARCHAR(200),
    description_en TEXT,
    description_ar TEXT,
    region_id UUID REFERENCES regions(id),
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    max_depth_meters INTEGER,
    min_depth_meters INTEGER,
    min_certification_level VARCHAR(100),
    min_logged_dives INTEGER DEFAULT 0,
    daily_diver_quota INTEGER,
    conservation_zone conservation_zone DEFAULT 'zone_2',
    conservation_fee_sar DECIMAL(10,2) DEFAULT 35.00,
    marine_protected_area BOOLEAN DEFAULT FALSE,
    seasonal_restrictions JSONB,
    access_requirements TEXT,
    hazards TEXT[],
    features TEXT[],
    marine_life TEXT[],
    best_season VARCHAR(100),
    visibility_typical_meters INTEGER,
    water_temp_min_c INTEGER,
    water_temp_max_c INTEGER,
    current_strength VARCHAR(50),
    difficulty_level VARCHAR(50),
    shore_accessible BOOLEAN DEFAULT FALSE,
    boat_required BOOLEAN DEFAULT TRUE,
    night_diving_allowed BOOLEAN DEFAULT TRUE,
    photos JSONB DEFAULT '[]',
    status user_status DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dive_sites_code ON dive_sites(srsa_site_code);
CREATE INDEX idx_dive_sites_region ON dive_sites(region_id);
CREATE INDEX idx_dive_sites_zone ON dive_sites(conservation_zone);
CREATE INDEX idx_dive_sites_status ON dive_sites(status);
CREATE INDEX idx_dive_sites_location ON dive_sites USING GIST (
    point(longitude, latitude)
);

-- SRSA quota reservations
CREATE TABLE srsa_quota_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES dive_sites(id),
    srsa_site_code VARCHAR(50) NOT NULL,
    trip_id UUID,
    center_id UUID REFERENCES diving_centers(id),
    reservation_date DATE NOT NULL,
    number_of_divers INTEGER NOT NULL,
    permit_number VARCHAR(100),
    permit_status permit_status DEFAULT 'pending',
    center_permit_number VARCHAR(100),
    vessel_registration VARCHAR(100),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    srsa_request_payload JSONB,
    srsa_response_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quota_reservations_site ON srsa_quota_reservations(site_id);
CREATE INDEX idx_quota_reservations_date ON srsa_quota_reservations(reservation_date);
CREATE INDEX idx_quota_reservations_center ON srsa_quota_reservations(center_id);
CREATE INDEX idx_quota_reservations_permit ON srsa_quota_reservations(permit_number);
CREATE INDEX idx_quota_reservations_status ON srsa_quota_reservations(permit_status);

-- Conservation fee transactions
CREATE TABLE conservation_fee_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quota_reservation_id UUID REFERENCES srsa_quota_reservations(id),
    site_id UUID NOT NULL REFERENCES dive_sites(id),
    booking_id UUID,
    center_id UUID REFERENCES diving_centers(id),
    amount_sar DECIMAL(10,2) NOT NULL,
    fee_per_diver_sar DECIMAL(10,2) NOT NULL,
    number_of_divers INTEGER NOT NULL,
    conservation_zone conservation_zone NOT NULL,
    payment_status payment_status DEFAULT 'pending',
    collected_at TIMESTAMPTZ,
    remitted_to_srsa_at TIMESTAMPTZ,
    srsa_transaction_reference VARCHAR(100),
    srsa_receipt_url VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conservation_fees_site ON conservation_fee_transactions(site_id);
CREATE INDEX idx_conservation_fees_booking ON conservation_fee_transactions(booking_id);
CREATE INDEX idx_conservation_fees_status ON conservation_fee_transactions(payment_status);

-- ============================================================================
-- TRIPS & BOOKINGS
-- ============================================================================

-- Trips
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    center_id UUID NOT NULL REFERENCES diving_centers(id),
    vessel_id UUID REFERENCES vessels(id),
    site_id UUID REFERENCES dive_sites(id),
    lead_instructor_id UUID REFERENCES users(id),
    title_en VARCHAR(200) NOT NULL,
    title_ar VARCHAR(200),
    description_en TEXT,
    description_ar TEXT,
    trip_type VARCHAR(50) NOT NULL,
    departure_datetime TIMESTAMPTZ NOT NULL,
    return_datetime TIMESTAMPTZ NOT NULL,
    meeting_point_en TEXT,
    meeting_point_ar TEXT,
    meeting_point_latitude DECIMAL(10, 8),
    meeting_point_longitude DECIMAL(11, 8),
    max_participants INTEGER NOT NULL,
    min_participants INTEGER DEFAULT 1,
    current_participants INTEGER DEFAULT 0,
    min_certification_level VARCHAR(100),
    min_logged_dives INTEGER DEFAULT 0,
    min_age INTEGER DEFAULT 10,
    max_age INTEGER,
    number_of_dives INTEGER DEFAULT 2,
    includes_equipment BOOLEAN DEFAULT FALSE,
    includes_meals BOOLEAN DEFAULT FALSE,
    includes_refreshments BOOLEAN DEFAULT TRUE,
    price_per_person_sar DECIMAL(10,2) NOT NULL,
    equipment_rental_price_sar DECIMAL(10,2),
    conservation_fee_included BOOLEAN DEFAULT FALSE,
    cancellation_policy TEXT,
    cancellation_deadline_hours INTEGER DEFAULT 24,
    quota_reservation_id UUID REFERENCES srsa_quota_reservations(id),
    status trip_status DEFAULT 'draft',
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trips_center ON trips(center_id);
CREATE INDEX idx_trips_site ON trips(site_id);
CREATE INDEX idx_trips_departure ON trips(departure_datetime);
CREATE INDEX idx_trips_status ON trips(status);

-- Trip instructors (many-to-many)
CREATE TABLE trip_instructors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'assistant',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(trip_id, instructor_id)
);

CREATE INDEX idx_trip_instructors_trip ON trip_instructors(trip_id);
CREATE INDEX idx_trip_instructors_instructor ON trip_instructors(instructor_id);

-- Bookings
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id),
    user_id UUID NOT NULL REFERENCES users(id),
    booked_by_user_id UUID REFERENCES users(id),
    center_id UUID NOT NULL REFERENCES diving_centers(id),
    booking_number VARCHAR(20) UNIQUE NOT NULL,
    status booking_status DEFAULT 'pending',
    number_of_divers INTEGER DEFAULT 1,
    base_price_sar DECIMAL(10,2) NOT NULL,
    equipment_rental_sar DECIMAL(10,2) DEFAULT 0,
    conservation_fee_sar DECIMAL(10,2) DEFAULT 0,
    insurance_fee_sar DECIMAL(10,2) DEFAULT 0,
    platform_fee_sar DECIMAL(10,2) DEFAULT 0,
    vat_amount_sar DECIMAL(10,2) DEFAULT 0,
    discount_amount_sar DECIMAL(10,2) DEFAULT 0,
    total_amount_sar DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'SAR',
    special_requests TEXT,
    dietary_requirements TEXT,
    equipment_sizes JSONB,
    waiver_signed_at TIMESTAMPTZ,
    waiver_ip_address INET,
    checked_in_at TIMESTAMPTZ,
    checked_in_by UUID REFERENCES users(id),
    parent_consent_required BOOLEAN DEFAULT FALSE,
    parent_consent_given_at TIMESTAMPTZ,
    parent_consent_by UUID REFERENCES users(id),
    cancellation_reason TEXT,
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES users(id),
    refund_amount_sar DECIMAL(10,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bookings_trip ON bookings(trip_id);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_center ON bookings(center_id);
CREATE INDEX idx_bookings_number ON bookings(booking_number);
CREATE INDEX idx_bookings_status ON bookings(status);

-- Waiting list
CREATE TABLE booking_waiting_list (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    notified_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(trip_id, user_id)
);

CREATE INDEX idx_waiting_list_trip ON booking_waiting_list(trip_id);
CREATE INDEX idx_waiting_list_user ON booking_waiting_list(user_id);

-- ============================================================================
-- PAYMENTS
-- ============================================================================

-- Payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    user_id UUID NOT NULL REFERENCES users(id),
    amount_sar DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'SAR',
    payment_method VARCHAR(50) NOT NULL,
    payment_gateway VARCHAR(50) NOT NULL,
    gateway_transaction_id VARCHAR(200),
    gateway_response JSONB,
    status payment_status DEFAULT 'pending',
    paid_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_reason TEXT,
    refunded_at TIMESTAMPTZ,
    refund_amount_sar DECIMAL(10,2),
    refund_reason TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_gateway_tx ON payments(gateway_transaction_id);

-- Center settlements/payouts
CREATE TABLE settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    center_id UUID NOT NULL REFERENCES diving_centers(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    gross_amount_sar DECIMAL(12,2) NOT NULL,
    platform_fee_sar DECIMAL(12,2) NOT NULL,
    conservation_fees_sar DECIMAL(12,2) NOT NULL,
    refunds_sar DECIMAL(12,2) DEFAULT 0,
    net_amount_sar DECIMAL(12,2) NOT NULL,
    booking_count INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    bank_account_iban VARCHAR(34),
    bank_name VARCHAR(100),
    transferred_at TIMESTAMPTZ,
    transfer_reference VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_settlements_center ON settlements(center_id);
CREATE INDEX idx_settlements_period ON settlements(period_start, period_end);
CREATE INDEX idx_settlements_status ON settlements(status);

-- ============================================================================
-- SAFETY & EMERGENCY
-- ============================================================================

-- Emergency incidents
CREATE TABLE emergency_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_number VARCHAR(50) UNIQUE NOT NULL,
    trip_id UUID REFERENCES trips(id),
    booking_id UUID REFERENCES bookings(id),
    center_id UUID REFERENCES diving_centers(id),
    site_id UUID REFERENCES dive_sites(id),
    reported_by_user_id UUID REFERENCES users(id),
    affected_user_id UUID REFERENCES users(id),
    incident_datetime TIMESTAMPTZ NOT NULL,
    incident_type VARCHAR(100) NOT NULL,
    severity incident_severity NOT NULL,
    description TEXT NOT NULL,
    location_description TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    depth_meters INTEGER,
    dive_time_minutes INTEGER,
    symptoms TEXT[],
    first_aid_given TEXT,
    hyperbaric_treatment_required BOOLEAN DEFAULT FALSE,
    hyperbaric_chamber_id UUID,
    hospital_name VARCHAR(200),
    outcome TEXT,
    srsa_notified_at TIMESTAMPTZ,
    srsa_case_number VARCHAR(50),
    insurance_claim_number VARCHAR(100),
    attachments JSONB DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'open',
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incidents_trip ON emergency_incidents(trip_id);
CREATE INDEX idx_incidents_center ON emergency_incidents(center_id);
CREATE INDEX idx_incidents_site ON emergency_incidents(site_id);
CREATE INDEX idx_incidents_datetime ON emergency_incidents(incident_datetime);
CREATE INDEX idx_incidents_severity ON emergency_incidents(severity);
CREATE INDEX idx_incidents_status ON emergency_incidents(status);

-- Hyperbaric chambers
CREATE TABLE hyperbaric_chambers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_en VARCHAR(200) NOT NULL,
    name_ar VARCHAR(200),
    facility_type VARCHAR(100),
    address_en TEXT,
    address_ar TEXT,
    city VARCHAR(100),
    region_id UUID REFERENCES regions(id),
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    phone_primary VARCHAR(20),
    phone_emergency VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    operating_hours JSONB,
    is_24_hour BOOLEAN DEFAULT FALSE,
    chamber_count INTEGER DEFAULT 1,
    max_patients_per_session INTEGER,
    moh_license_number VARCHAR(100),
    status user_status DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chambers_city ON hyperbaric_chambers(city);
CREATE INDEX idx_chambers_region ON hyperbaric_chambers(region_id);
CREATE INDEX idx_chambers_status ON hyperbaric_chambers(status);
CREATE INDEX idx_chambers_location ON hyperbaric_chambers USING GIST (
    point(longitude, latitude)
);

-- ============================================================================
-- COMMUNITY FEATURES
-- ============================================================================

-- Buddy requests
CREATE TABLE buddy_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES users(id),
    trip_id UUID REFERENCES trips(id),
    site_id UUID REFERENCES dive_sites(id),
    preferred_date DATE,
    experience_level_min VARCHAR(50),
    experience_level_max VARCHAR(50),
    certification_required VARCHAR(100),
    language_preference VARCHAR(10),
    message TEXT,
    status VARCHAR(50) DEFAULT 'open',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_buddy_requests_requester ON buddy_requests(requester_id);
CREATE INDEX idx_buddy_requests_trip ON buddy_requests(trip_id);
CREATE INDEX idx_buddy_requests_status ON buddy_requests(status);

-- Buddy matches
CREATE TABLE buddy_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES buddy_requests(id),
    matched_user_id UUID NOT NULL REFERENCES users(id),
    compatibility_score DECIMAL(5,2),
    status VARCHAR(50) DEFAULT 'pending',
    requester_accepted_at TIMESTAMPTZ,
    matched_accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_buddy_matches_request ON buddy_matches(request_id);
CREATE INDEX idx_buddy_matches_matched ON buddy_matches(matched_user_id);

-- Reviews
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    booking_id UUID REFERENCES bookings(id),
    reviewable_type VARCHAR(50) NOT NULL,
    reviewable_id UUID NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    content TEXT,
    pros TEXT[],
    cons TEXT[],
    photos JSONB DEFAULT '[]',
    is_verified_booking BOOLEAN DEFAULT FALSE,
    helpful_count INTEGER DEFAULT 0,
    reported_count INTEGER DEFAULT 0,
    center_response TEXT,
    center_responded_at TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'published',
    moderated_at TIMESTAMPTZ,
    moderated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_booking ON reviews(booking_id);
CREATE INDEX idx_reviews_reviewable ON reviews(reviewable_type, reviewable_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_status ON reviews(status);

-- Dive logs
CREATE TABLE dive_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    trip_id UUID REFERENCES trips(id),
    booking_id UUID REFERENCES bookings(id),
    site_id UUID REFERENCES dive_sites(id),
    dive_number INTEGER,
    dive_date DATE NOT NULL,
    entry_time TIME,
    exit_time TIME,
    bottom_time_minutes INTEGER,
    max_depth_meters DECIMAL(5,2),
    avg_depth_meters DECIMAL(5,2),
    water_temp_c INTEGER,
    visibility_meters INTEGER,
    weight_kg DECIMAL(4,1),
    suit_type VARCHAR(50),
    tank_type VARCHAR(50),
    tank_size_liters INTEGER,
    start_pressure_bar INTEGER,
    end_pressure_bar INTEGER,
    air_consumption_rate DECIMAL(4,2),
    gas_mixture VARCHAR(50) DEFAULT 'air',
    dive_type VARCHAR(50),
    entry_type VARCHAR(50),
    current_conditions VARCHAR(50),
    weather_conditions VARCHAR(50),
    buddy_name VARCHAR(200),
    buddy_user_id UUID REFERENCES users(id),
    instructor_id UUID REFERENCES users(id),
    notes TEXT,
    marine_life_spotted TEXT[],
    photos JSONB DEFAULT '[]',
    computer_data JSONB,
    is_training_dive BOOLEAN DEFAULT FALSE,
    signature_url VARCHAR(500),
    verified_by_instructor BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dive_logs_user ON dive_logs(user_id);
CREATE INDEX idx_dive_logs_trip ON dive_logs(trip_id);
CREATE INDEX idx_dive_logs_site ON dive_logs(site_id);
CREATE INDEX idx_dive_logs_date ON dive_logs(dive_date);

-- ============================================================================
-- MESSAGING
-- ============================================================================

-- Conversations
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) DEFAULT 'direct',
    trip_id UUID REFERENCES trips(id),
    center_id UUID REFERENCES diving_centers(id),
    title VARCHAR(200),
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_trip ON conversations(trip_id);
CREATE INDEX idx_conversations_center ON conversations(center_id);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at);

-- Conversation participants
CREATE TABLE conversation_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    last_read_at TIMESTAMPTZ,
    muted_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_conv_participants_conv ON conversation_participants(conversation_id);
CREATE INDEX idx_conv_participants_user ON conversation_participants(user_id);

-- Messages
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'text',
    attachments JSONB DEFAULT '[]',
    reply_to_id UUID REFERENCES messages(id),
    edited_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created ON messages(created_at);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    title_en VARCHAR(200) NOT NULL,
    title_ar VARCHAR(200),
    body_en TEXT,
    body_ar TEXT,
    data JSONB,
    action_url VARCHAR(500),
    read_at TIMESTAMPTZ,
    sent_via TEXT[] DEFAULT ARRAY['in_app'],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_read ON notifications(read_at);
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- ============================================================================
-- AUDIT & COMPLIANCE
-- ============================================================================

-- Audit logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- Verification tokens (email, phone, password reset)
CREATE TABLE verification_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    token_type VARCHAR(50) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_verification_tokens_user ON verification_tokens(user_id);
CREATE INDEX idx_verification_tokens_hash ON verification_tokens(token_hash);
CREATE INDEX idx_verification_tokens_type ON verification_tokens(token_type);

-- Refresh tokens
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    device_info JSONB,
    ip_address INET,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all relevant tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN
        SELECT table_name
        FROM information_schema.columns
        WHERE column_name = 'updated_at'
        AND table_schema = 'public'
    LOOP
        EXECUTE format('
            CREATE TRIGGER update_%I_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        ', t, t);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to generate booking number
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.booking_number = 'BK' || TO_CHAR(NOW(), 'YYMMDD') || '-' ||
                         UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_booking_number
BEFORE INSERT ON bookings
FOR EACH ROW
WHEN (NEW.booking_number IS NULL)
EXECUTE FUNCTION generate_booking_number();

-- Function to generate incident number
CREATE OR REPLACE FUNCTION generate_incident_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.incident_number = 'INC' || TO_CHAR(NOW(), 'YYMMDD') || '-' ||
                          LPAD(NEXTVAL('incident_number_seq')::TEXT, 4, '0');
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE SEQUENCE IF NOT EXISTS incident_number_seq START 1;

CREATE TRIGGER set_incident_number
BEFORE INSERT ON emergency_incidents
FOR EACH ROW
WHEN (NEW.incident_number IS NULL)
EXECUTE FUNCTION generate_incident_number();

-- Function to update trip participant count
CREATE OR REPLACE FUNCTION update_trip_participant_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE trips SET current_participants = current_participants + NEW.number_of_divers
        WHERE id = NEW.trip_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE trips SET current_participants = current_participants - OLD.number_of_divers
        WHERE id = OLD.trip_id;
    ELSIF TG_OP = 'UPDATE' AND NEW.status != OLD.status THEN
        IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
            UPDATE trips SET current_participants = current_participants - NEW.number_of_divers
            WHERE id = NEW.trip_id;
        ELSIF OLD.status = 'cancelled' AND NEW.status != 'cancelled' THEN
            UPDATE trips SET current_participants = current_participants + NEW.number_of_divers
            WHERE id = NEW.trip_id;
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE TRIGGER update_trip_participants
AFTER INSERT OR UPDATE OR DELETE ON bookings
FOR EACH ROW
EXECUTE FUNCTION update_trip_participant_count();

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert default regions
INSERT INTO regions (code, name_en, name_ar, region_type) VALUES
    ('SA-MK', 'Makkah Region', 'منطقة مكة المكرمة', 'administrative'),
    ('SA-MD', 'Madinah Region', 'منطقة المدينة المنورة', 'administrative'),
    ('SA-TB', 'Tabuk Region', 'منطقة تبوك', 'administrative'),
    ('SA-AS', 'Asir Region', 'منطقة عسير', 'administrative'),
    ('SA-JZ', 'Jazan Region', 'منطقة جازان', 'administrative');

-- Insert default cities under regions
INSERT INTO regions (code, name_en, name_ar, parent_region_id, region_type)
SELECT
    'SA-JED', 'Jeddah', 'جدة', id, 'city'
FROM regions WHERE code = 'SA-MK';

INSERT INTO regions (code, name_en, name_ar, parent_region_id, region_type)
SELECT
    'SA-YNB', 'Yanbu', 'ينبع', id, 'city'
FROM regions WHERE code = 'SA-MD';

INSERT INTO regions (code, name_en, name_ar, parent_region_id, region_type)
SELECT
    'SA-UML', 'Umluj', 'أملج', id, 'city'
FROM regions WHERE code = 'SA-TB';

-- Insert sample dive sites
INSERT INTO dive_sites (srsa_site_code, name_en, name_ar, latitude, longitude, max_depth_meters, daily_diver_quota, conservation_zone, conservation_fee_sar, marine_protected_area, difficulty_level, min_certification_level) VALUES
    ('JEDDAH_01', 'Jeddah Reef', 'شعاب جدة', 21.5433, 39.1728, 25, 100, 'zone_2', 35.00, FALSE, 'beginner', 'Open Water'),
    ('JEDDAH_02', 'Sheraton Beach Reef', 'شعاب شاطئ شيراتون', 21.5821, 39.1156, 18, 80, 'zone_2', 35.00, FALSE, 'beginner', 'Open Water'),
    ('YANBU_01', 'Seven Sisters', 'الأخوات السبع', 24.0889, 38.0631, 30, 60, 'zone_1', 50.00, TRUE, 'intermediate', 'Advanced Open Water'),
    ('FARASAN_01', 'Farasan Banks', 'ضفاف فرسان', 16.7000, 41.9167, 40, 40, 'zone_1', 50.00, TRUE, 'advanced', 'Advanced Open Water'),
    ('UMLUJ_01', 'Umluj Islands', 'جزر أملج', 25.0500, 37.2667, 22, 50, 'zone_2', 35.00, FALSE, 'beginner', 'Open Water');

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE users IS 'Core user accounts for all platform participants';
COMMENT ON TABLE diver_profiles IS 'Extended profile information for divers';
COMMENT ON TABLE instructor_profiles IS 'Extended profile information for certified instructors';
COMMENT ON TABLE parent_guardian_links IS 'Links between parent accounts and minor diver accounts';
COMMENT ON TABLE certifications IS 'Diving certifications from recognized agencies';
COMMENT ON TABLE diving_centers IS 'Registered diving centers and operators';
COMMENT ON TABLE vessels IS 'Boats and liveaboards operated by diving centers';
COMMENT ON TABLE dive_sites IS 'Official dive sites registered with SRSA';
COMMENT ON TABLE srsa_quota_reservations IS 'Daily quota reservations for dive sites';
COMMENT ON TABLE conservation_fee_transactions IS 'Conservation fees collected for SRSA';
COMMENT ON TABLE trips IS 'Scheduled diving trips offered by centers';
COMMENT ON TABLE bookings IS 'User bookings for diving trips';
COMMENT ON TABLE payments IS 'Payment transactions for bookings';
COMMENT ON TABLE emergency_incidents IS 'Diving incident reports for safety tracking';
COMMENT ON TABLE hyperbaric_chambers IS 'Registry of hyperbaric treatment facilities';
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for compliance';
