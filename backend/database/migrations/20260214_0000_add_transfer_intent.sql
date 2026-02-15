-- Migration to add transfer_intent boolean column to players table
-- This indicates a player intends to transfer because their dealbreaker is not being met

ALTER TABLE players
ADD COLUMN IF NOT EXISTS transfer_intent BOOLEAN DEFAULT FALSE;

-- Create index for efficient filtering of transfer intent players
CREATE INDEX IF NOT EXISTS idx_players_transfer_intent ON players(transfer_intent) WHERE transfer_intent = TRUE;

COMMENT ON COLUMN players.transfer_intent IS 'Indicates the player intends to transfer because their dealbreaker is not being met';
