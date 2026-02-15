-- Migration to add archetype column to players table
-- Stores the player's archetype (e.g., 'Pocket Passer', 'Pure Power', 'Coverage Specialist')

ALTER TABLE players
ADD COLUMN IF NOT EXISTS archetype VARCHAR(50);

COMMENT ON COLUMN players.archetype IS 'Player archetype (e.g., Pocket Passer, Dual Threat, Pure Power)';
