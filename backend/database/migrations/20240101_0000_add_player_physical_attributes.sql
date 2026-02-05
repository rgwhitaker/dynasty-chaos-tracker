-- Migration to add height, weight, and dev_trait to players table
-- Run this migration after initial setup to add new columns

ALTER TABLE players 
ADD COLUMN IF NOT EXISTS height VARCHAR(10),
ADD COLUMN IF NOT EXISTS weight INTEGER,
ADD COLUMN IF NOT EXISTS dev_trait VARCHAR(20);

-- Also add the same columns to recruits table for consistency
ALTER TABLE recruits 
ADD COLUMN IF NOT EXISTS height VARCHAR(10),
ADD COLUMN IF NOT EXISTS weight INTEGER,
ADD COLUMN IF NOT EXISTS dev_trait VARCHAR(20);
