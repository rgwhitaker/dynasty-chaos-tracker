-- Dynasty Tracker Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    google_id VARCHAR(255) UNIQUE,
    twitter_id VARCHAR(255) UNIQUE,
    display_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dynasties table (user's dynasty save files)
CREATE TABLE IF NOT EXISTS dynasties (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    team_name VARCHAR(255) NOT NULL,
    school VARCHAR(255) NOT NULL,
    conference VARCHAR(100),
    season_year INTEGER,
    current_week INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Roster Versions table (for season progression tracking)
CREATE TABLE IF NOT EXISTS roster_versions (
    id SERIAL PRIMARY KEY,
    dynasty_id INTEGER REFERENCES dynasties(id) ON DELETE CASCADE,
    season_year INTEGER NOT NULL,
    version_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Players table (with flexible JSONB attributes)
CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    dynasty_id INTEGER REFERENCES dynasties(id) ON DELETE CASCADE,
    roster_version_id INTEGER REFERENCES roster_versions(id) ON DELETE SET NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    position VARCHAR(10) NOT NULL,
    jersey_number INTEGER,
    year VARCHAR(20), -- FR, SO, JR, SR, GRAD
    overall_rating INTEGER,
    height VARCHAR(10), -- Height (e.g., "6'2\"")
    weight INTEGER, -- Weight in pounds
    dev_trait VARCHAR(20), -- Development Trait: Normal, Impact, Star, Elite
    attributes JSONB, -- Flexible storage for all position-specific attributes (55 ratings)
    dealbreakers TEXT[], -- Array of dealbreaker flags
    transfer_intent BOOLEAN DEFAULT FALSE, -- Player intends to transfer (dealbreaker not met)
    departure_risk DECIMAL(5,2), -- Predicted probability of leaving
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Depth Charts table
CREATE TABLE IF NOT EXISTS depth_charts (
    id SERIAL PRIMARY KEY,
    dynasty_id INTEGER REFERENCES dynasties(id) ON DELETE CASCADE,
    position VARCHAR(10) NOT NULL,
    depth_order INTEGER NOT NULL,
    player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
    is_manual_override BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(dynasty_id, position, depth_order)
);

-- Weight Presets table (user-defined weighting schemes)
CREATE TABLE IF NOT EXISTS weight_presets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    preset_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, preset_name)
);

-- Stud Score Weights table (user customizable per preset)
CREATE TABLE IF NOT EXISTS stud_score_weights (
    id SERIAL PRIMARY KEY,
    preset_id INTEGER REFERENCES weight_presets(id) ON DELETE CASCADE,
    position VARCHAR(10) NOT NULL,
    attribute_name VARCHAR(50) NOT NULL,
    weight DECIMAL(5,2) NOT NULL DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(preset_id, position, attribute_name)
);

-- Recruits table
CREATE TABLE IF NOT EXISTS recruits (
    id SERIAL PRIMARY KEY,
    dynasty_id INTEGER REFERENCES dynasties(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    position VARCHAR(10) NOT NULL,
    stars INTEGER,
    overall_rating INTEGER,
    height VARCHAR(10), -- Height (e.g., "6'2\"")
    weight INTEGER, -- Weight in pounds
    dev_trait VARCHAR(20), -- Development Trait: Normal, Impact, Star, Elite
    attributes JSONB, -- Predicted/known attributes (55 ratings)
    commitment_status VARCHAR(50), -- Committed, Considering, Not Interested
    commitment_probability DECIMAL(5,2), -- ML-predicted probability
    dealbreakers TEXT[], -- Array of dealbreaker preferences
    dealbreaker_fit_score DECIMAL(5,2), -- How well they fit user's dynasty
    priority_score DECIMAL(5,2), -- Calculated recruiting priority
    hometown VARCHAR(255),
    state VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OCR Upload History
CREATE TABLE IF NOT EXISTS ocr_uploads (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    dynasty_id INTEGER REFERENCES dynasties(id) ON DELETE CASCADE,
    file_paths TEXT[], -- Array of file paths for batch uploads
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processing_status VARCHAR(50), -- pending, processing, completed, failed
    ocr_method VARCHAR(50), -- tesseract, textract, google_vision
    players_imported INTEGER DEFAULT 0,
    validation_errors JSONB, -- Store validation issues for manual correction
    is_preprocessed BOOLEAN DEFAULT FALSE
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    dynasty_id INTEGER REFERENCES dynasties(id) ON DELETE CASCADE,
    notification_type VARCHAR(50), -- recruiting_reminder, player_departure, etc.
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shared Dynasties table (for community features)
CREATE TABLE IF NOT EXISTS shared_dynasties (
    id SERIAL PRIMARY KEY,
    dynasty_id INTEGER REFERENCES dynasties(id) ON DELETE CASCADE,
    share_token VARCHAR(255) UNIQUE NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_players_dynasty_id ON players(dynasty_id);
CREATE INDEX IF NOT EXISTS idx_players_position ON players(position);
CREATE INDEX IF NOT EXISTS idx_players_attributes ON players USING GIN (attributes);
CREATE INDEX IF NOT EXISTS idx_depth_charts_dynasty_id ON depth_charts(dynasty_id);
CREATE INDEX IF NOT EXISTS idx_dynasties_user_id ON dynasties(user_id);
CREATE INDEX IF NOT EXISTS idx_recruits_dynasty_id ON recruits(dynasty_id);
CREATE INDEX IF NOT EXISTS idx_recruits_attributes ON recruits USING GIN (attributes);
CREATE INDEX IF NOT EXISTS idx_ocr_uploads_user_id ON ocr_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_dynasties_token ON shared_dynasties(share_token);
