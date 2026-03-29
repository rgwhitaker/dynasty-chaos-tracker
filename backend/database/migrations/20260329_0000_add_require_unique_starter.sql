ALTER TABLE roster_archetype_groups
ADD COLUMN IF NOT EXISTS require_unique_starter BOOLEAN NOT NULL DEFAULT FALSE;
