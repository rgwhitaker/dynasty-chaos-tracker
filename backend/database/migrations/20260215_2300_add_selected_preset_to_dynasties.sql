-- Migration to add selected stud score preset to dynasties table
-- This allows each dynasty to have a preferred preset for calculating player stud scores

ALTER TABLE dynasties
ADD COLUMN IF NOT EXISTS selected_preset_id INTEGER REFERENCES weight_presets(id) ON DELETE SET NULL;

COMMENT ON COLUMN dynasties.selected_preset_id IS 'ID of the selected stud score preset for this dynasty';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_dynasties_selected_preset_id ON dynasties(selected_preset_id);
