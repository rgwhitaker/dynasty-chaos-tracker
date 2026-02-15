-- Migration to remove 'Take Down' archetype from linebacker positions
-- 'Take Down' is an ability, not an archetype. The correct linebacker archetypes are:
-- Lurker, Signal Caller, and Thumper

-- Update any players with 'Take Down' archetype to NULL
-- (They should be re-assigned to one of the valid archetypes by the user)
UPDATE players
SET archetype = NULL
WHERE archetype = 'Take Down'
  AND position IN ('SAM', 'MIKE', 'WILL');

COMMENT ON COLUMN players.archetype IS 'Player archetype. Valid archetypes vary by position. See playerAttributes.js for complete list.';
