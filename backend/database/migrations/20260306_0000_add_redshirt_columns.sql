-- Add redshirt tracking columns for season advancement workflow
ALTER TABLE players
ADD COLUMN IF NOT EXISTS redshirted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS redshirt_used BOOLEAN DEFAULT FALSE;
