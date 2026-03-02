-- Migration to add abilities column to players and recruits tables
-- Stores player ability levels as JSONB (e.g., {"Resistance": "Gold", "Winning Time": "Platinum"})

-- Add abilities JSONB column to players table
ALTER TABLE players
ADD COLUMN IF NOT EXISTS abilities JSONB;

COMMENT ON COLUMN players.abilities IS 'Player ability levels (e.g., {"Resistance": "Gold", "Winning Time": "Platinum"})';

-- Add archetype column to recruits table (was missing)
ALTER TABLE recruits
ADD COLUMN IF NOT EXISTS archetype VARCHAR(50);

COMMENT ON COLUMN recruits.archetype IS 'Recruit archetype (e.g., Pocket Passer, Dual Threat, Pure Power)';

-- Add abilities JSONB column to recruits table
ALTER TABLE recruits
ADD COLUMN IF NOT EXISTS abilities JSONB;

COMMENT ON COLUMN recruits.abilities IS 'Recruit ability levels (e.g., {"Resistance": "Gold", "Winning Time": "Platinum"})';
