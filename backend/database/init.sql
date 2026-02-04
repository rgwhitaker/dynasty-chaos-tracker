-- Dynasty Tracker Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    google_id VARCHAR(255) UNIQUE,
    display_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teams table (user's dynasty teams)
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    team_name VARCHAR(255) NOT NULL,
    school VARCHAR(255) NOT NULL,
    conference VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Players table
CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    position VARCHAR(10) NOT NULL,
    jersey_number INTEGER,
    year VARCHAR(20), -- FR, SO, JR, SR
    overall_rating INTEGER,
    speed INTEGER,
    strength INTEGER,
    awareness INTEGER,
    agility INTEGER,
    acceleration INTEGER,
    stamina INTEGER,
    injury INTEGER,
    -- Position-specific attributes (can be NULL for non-applicable positions)
    throw_power INTEGER,
    throw_accuracy INTEGER,
    carrying INTEGER,
    catching INTEGER,
    route_running INTEGER,
    blocking INTEGER,
    tackling INTEGER,
    coverage INTEGER,
    kick_power INTEGER,
    kick_accuracy INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Depth Charts table
CREATE TABLE IF NOT EXISTS depth_charts (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    position VARCHAR(10) NOT NULL,
    depth_order INTEGER NOT NULL,
    player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, position, depth_order)
);

-- Stud Score Weights table (user customizable)
CREATE TABLE IF NOT EXISTS stud_score_weights (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    position VARCHAR(10) NOT NULL,
    attribute_name VARCHAR(50) NOT NULL,
    weight DECIMAL(5,2) NOT NULL DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, position, attribute_name)
);

-- Recruits table
CREATE TABLE IF NOT EXISTS recruits (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    position VARCHAR(10) NOT NULL,
    stars INTEGER,
    overall_rating INTEGER,
    commitment_status VARCHAR(50), -- Committed, Considering, Not Interested
    commitment_probability DECIMAL(5,2), -- Predicted probability
    hometown VARCHAR(255),
    state VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OCR Upload History
CREATE TABLE IF NOT EXISTS ocr_uploads (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    file_name VARCHAR(255),
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processing_status VARCHAR(50), -- pending, processing, completed, failed
    ocr_method VARCHAR(50), -- tesseract, textract
    players_imported INTEGER DEFAULT 0
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_players_position ON players(position);
CREATE INDEX IF NOT EXISTS idx_depth_charts_team_id ON depth_charts(team_id);
CREATE INDEX IF NOT EXISTS idx_teams_user_id ON teams(user_id);
CREATE INDEX IF NOT EXISTS idx_recruits_team_id ON recruits(team_id);
CREATE INDEX IF NOT EXISTS idx_ocr_uploads_user_id ON ocr_uploads(user_id);
