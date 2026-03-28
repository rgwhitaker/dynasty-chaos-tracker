CREATE TABLE IF NOT EXISTS roster_archetype_groups (
    id SERIAL PRIMARY KEY,
    dynasty_id INTEGER REFERENCES dynasties(id) ON DELETE CASCADE,
    unit VARCHAR(20) NOT NULL,
    group_name VARCHAR(100) NOT NULL,
    positions TEXT[] NOT NULL DEFAULT '{}',
    archetypes TEXT[] NOT NULL DEFAULT '{}',
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_roster_archetype_groups_dynasty_id
    ON roster_archetype_groups(dynasty_id);
