CREATE TABLE IF NOT EXISTS recruiter_hub_depth_chart_mapping (
    id SERIAL PRIMARY KEY,
    dynasty_id INTEGER REFERENCES dynasties(id) ON DELETE CASCADE,
    slot VARCHAR(10) NOT NULL,
    rules_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(dynasty_id, slot)
);

CREATE INDEX IF NOT EXISTS idx_recruiter_hub_depth_chart_mapping_dynasty_id
    ON recruiter_hub_depth_chart_mapping(dynasty_id);
