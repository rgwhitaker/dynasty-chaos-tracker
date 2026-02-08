-- Migration to add stat_caps JSONB column to players and recruits tables
-- This enables tracking of player potential via stat group cap data

-- Add stat_caps to players table
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS stat_caps JSONB;

-- Add stat_caps to recruits table
ALTER TABLE recruits 
ADD COLUMN IF NOT EXISTS stat_caps JSONB;

-- Create GIN index for efficient JSONB queries on players
CREATE INDEX IF NOT EXISTS idx_players_stat_caps ON players USING GIN (stat_caps);

-- Create GIN index for efficient JSONB queries on recruits
CREATE INDEX IF NOT EXISTS idx_recruits_stat_caps ON recruits USING GIN (stat_caps);

-- Add comment to document the structure
COMMENT ON COLUMN players.stat_caps IS 'JSONB structure: {"StatGroup": {"purchased_blocks": number, "capped_blocks": [array of integers 1-20]}}';
COMMENT ON COLUMN recruits.stat_caps IS 'JSONB structure: {"StatGroup": {"purchased_blocks": number, "capped_blocks": [array of integers 1-20]}}';
