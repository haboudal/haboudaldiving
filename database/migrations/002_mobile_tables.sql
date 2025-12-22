-- Migration: Mobile App Tables
-- Description: Add tables for mobile device management, notifications preferences, and offline sync
-- Date: 2025-12-22

-- Device types enum
CREATE TYPE device_type AS ENUM ('ios', 'android', 'web');
CREATE TYPE push_token_type AS ENUM ('fcm', 'apn', 'web_push');
CREATE TYPE sync_status AS ENUM ('pending', 'synced', 'failed', 'conflict');

-- Mobile devices table
CREATE TABLE mobile_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_identifier VARCHAR(255) NOT NULL,
    device_type device_type NOT NULL,
    device_name VARCHAR(100),
    os_version VARCHAR(50),
    app_version VARCHAR(50),
    model VARCHAR(100),
    push_token VARCHAR(500),
    push_token_type push_token_type,
    push_enabled BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, device_identifier)
);

-- User notification preferences
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    push_enabled BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    in_app_enabled BOOLEAN DEFAULT TRUE,
    notification_types JSONB DEFAULT '{"booking_confirmed": true, "trip_reminder": true, "payment_received": true, "new_message": true, "review_response": true}',
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    timezone VARCHAR(50) DEFAULT 'Asia/Riyadh',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sync queue for offline changes
CREATE TABLE sync_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES mobile_devices(id) ON DELETE SET NULL,
    client_id VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    payload JSONB NOT NULL,
    status sync_status DEFAULT 'pending',
    server_entity_id UUID,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    synced_at TIMESTAMPTZ,
    UNIQUE(user_id, client_id)
);

-- Sync checkpoints for delta sync
CREATE TABLE sync_checkpoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES mobile_devices(id) ON DELETE CASCADE,
    entity_type VARCHAR(100) NOT NULL,
    last_sync_at TIMESTAMPTZ NOT NULL,
    sync_token VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, device_id, entity_type)
);

-- Indexes for mobile_devices
CREATE INDEX idx_mobile_devices_user ON mobile_devices(user_id);
CREATE INDEX idx_mobile_devices_push ON mobile_devices(push_token) WHERE push_token IS NOT NULL;
CREATE INDEX idx_mobile_devices_active ON mobile_devices(user_id, is_active) WHERE is_active = TRUE;

-- Indexes for user_preferences
CREATE INDEX idx_user_preferences_user ON user_preferences(user_id);

-- Indexes for sync_queue
CREATE INDEX idx_sync_queue_user_status ON sync_queue(user_id, status);
CREATE INDEX idx_sync_queue_device ON sync_queue(device_id);
CREATE INDEX idx_sync_queue_pending ON sync_queue(user_id, status, created_at) WHERE status = 'pending';

-- Indexes for sync_checkpoints
CREATE INDEX idx_sync_checkpoints_user ON sync_checkpoints(user_id, device_id);
CREATE INDEX idx_sync_checkpoints_entity ON sync_checkpoints(user_id, entity_type);
