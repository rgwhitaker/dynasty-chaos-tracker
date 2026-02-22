-- Add recruiter hub configuration table for per-dynasty target depth settings
CREATE TABLE IF NOT EXISTS recruiter_hub_config (
    id SERIAL PRIMARY KEY,
    dynasty_id INTEGER REFERENCES dynasties(id) ON DELETE CASCADE,
    position VARCHAR(10) NOT NULL,
    target_depth INTEGER NOT NULL DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(dynasty_id, position)
);

CREATE INDEX IF NOT EXISTS idx_recruiter_hub_config_dynasty_id ON recruiter_hub_config(dynasty_id);
