-- Add missing recruit board fields for editing and tracking
ALTER TABLE recruits
ADD COLUMN IF NOT EXISTS recruit_class VARCHAR(20),
ADD COLUMN IF NOT EXISTS gem_status VARCHAR(20),
ADD COLUMN IF NOT EXISTS archetype VARCHAR(100),
ADD COLUMN IF NOT EXISTS dev_trait VARCHAR(20);

-- Default recruit board fields
ALTER TABLE recruits
ALTER COLUMN recruit_class SET DEFAULT 'High School',
ALTER COLUMN gem_status SET DEFAULT 'Unknown',
ALTER COLUMN dev_trait SET DEFAULT 'Unknown';

UPDATE recruits
SET
  recruit_class = COALESCE(recruit_class, 'High School'),
  gem_status = COALESCE(gem_status, 'Unknown'),
  dev_trait = COALESCE(dev_trait, 'Unknown')
WHERE recruit_class IS NULL OR gem_status IS NULL OR dev_trait IS NULL;
