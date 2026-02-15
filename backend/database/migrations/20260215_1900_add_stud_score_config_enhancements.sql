-- Migration to enhance STUD score configuration with archetype support and dev trait/potential weights
-- This allows users to configure weights at position level (default) and override per archetype

-- Step 1: Add archetype column to stud_score_weights table
-- NULL archetype means it's a position-level default
ALTER TABLE stud_score_weights
ADD COLUMN IF NOT EXISTS archetype VARCHAR(50);

-- Update the unique constraint to include archetype
ALTER TABLE stud_score_weights
DROP CONSTRAINT IF EXISTS stud_score_weights_preset_id_position_attribute_name_key;

ALTER TABLE stud_score_weights
ADD CONSTRAINT stud_score_weights_unique_key 
UNIQUE(preset_id, position, archetype, attribute_name);

COMMENT ON COLUMN stud_score_weights.archetype IS 'Player archetype for this weight (NULL = position default)';

-- Step 2: Add dev trait and potential weight columns to weight_presets
-- These control how much dev trait and potential percentage impact the final STUD score
ALTER TABLE weight_presets
ADD COLUMN IF NOT EXISTS dev_trait_weight DECIMAL(3,2) DEFAULT 0.15,
ADD COLUMN IF NOT EXISTS potential_weight DECIMAL(3,2) DEFAULT 0.15;

COMMENT ON COLUMN weight_presets.dev_trait_weight IS 'Weight for dev trait impact on STUD score (0.0-1.0)';
COMMENT ON COLUMN weight_presets.potential_weight IS 'Weight for potential percentage impact on STUD score (0.0-1.0)';

-- Step 3: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_stud_score_weights_preset_position 
ON stud_score_weights(preset_id, position);

CREATE INDEX IF NOT EXISTS idx_stud_score_weights_archetype 
ON stud_score_weights(preset_id, position, archetype);
