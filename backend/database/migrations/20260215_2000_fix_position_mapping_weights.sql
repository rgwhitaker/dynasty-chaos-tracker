-- Migration to fix position mapping in stud_score_weights
-- This migration ensures all specific roster positions have default weights,
-- not just position groups
--
-- NOTE: The position_map and default_weights JSON objects below are a snapshot
-- of POSITION_GROUP_MAP and DEFAULT_WEIGHTS from backend/src/services/studScoreService.js
-- as of migration date (2026-02-15). If these values change in the application code,
-- this migration will continue to work with the historical values, which is correct
-- for a one-time data fix migration.

DO $$
DECLARE
    preset_record RECORD;
    position_map JSON;
    default_weights JSON;
    roster_position TEXT;
    position_group TEXT;
    attr TEXT;
    weight_val DECIMAL(5,2);
BEGIN
    -- Define position group mapping (snapshot from POSITION_GROUP_MAP)
    position_map := '{
        "QB": "QB",
        "HB": "RB",
        "FB": "RB",
        "WR": "WR",
        "TE": "TE",
        "LT": "OL",
        "LG": "OL",
        "C": "OL",
        "RG": "OL",
        "RT": "OL",
        "LEDG": "DL",
        "REDG": "DL",
        "DT": "DL",
        "SAM": "LB",
        "MIKE": "LB",
        "WILL": "LB",
        "CB": "DB",
        "FS": "DB",
        "SS": "DB",
        "K": "K",
        "P": "P"
    }'::JSON;

    -- Define default weights (snapshot from DEFAULT_WEIGHTS)
    default_weights := '{
        "QB": {"THP": 1.5, "SAC": 2.0, "MAC": 2.0, "DAC": 1.8, "TUP": 1.3, "AWR": 1.5, "SPD": 0.8, "AGI": 0.7},
        "RB": {"SPD": 1.8, "ACC": 1.5, "AGI": 1.4, "CAR": 1.3, "BTK": 1.5, "CTH": 0.9, "AWR": 1.0},
        "WR": {"SPD": 1.7, "ACC": 1.3, "CTH": 1.8, "SPC": 1.2, "SRR": 1.5, "MRR": 1.5, "DRR": 1.5, "RLS": 1.3, "CIT": 1.4, "AWR": 1.0},
        "TE": {"CTH": 1.6, "SRR": 1.2, "RBK": 1.4, "SPD": 1.0, "STR": 1.3, "AWR": 1.1},
        "OL": {"STR": 1.8, "PBK": 1.7, "RBK": 1.7, "AWR": 1.5, "AGI": 0.8},
        "DL": {"PMV": 1.6, "FMV": 1.6, "BSH": 1.7, "STR": 1.5, "PUR": 1.3, "TAK": 1.4, "AWR": 1.2},
        "LB": {"TAK": 1.7, "PUR": 1.5, "PRC": 1.6, "MCV": 1.3, "ZCV": 1.3, "BSH": 1.4, "SPD": 1.2, "AWR": 1.5},
        "DB": {"MCV": 1.8, "ZCV": 1.8, "SPD": 1.7, "ACC": 1.5, "AGI": 1.4, "CTH": 1.2, "PRC": 1.5, "AWR": 1.4},
        "K": {"KPW": 2.0, "KAC": 2.0, "AWR": 1.0},
        "P": {"KPW": 1.8, "KAC": 1.8, "AWR": 1.0}
    }'::JSON;

    -- For each weight preset
    FOR preset_record IN SELECT id FROM weight_presets LOOP
        -- For each roster position
        FOR roster_position IN SELECT * FROM json_object_keys(position_map) LOOP
            -- Get the position group for this roster position
            position_group := position_map->>roster_position;
            
            -- Check if weights exist for this roster position
            -- If not, add default weights for the position group
            IF NOT EXISTS (
                SELECT 1 FROM stud_score_weights 
                WHERE preset_id = preset_record.id 
                AND position = roster_position
                AND archetype IS NULL
            ) THEN
                -- Insert default weights for this position
                FOR attr IN SELECT * FROM json_object_keys(default_weights->position_group) LOOP
                    weight_val := (default_weights->position_group->>attr)::DECIMAL(5,2);
                    
                    -- Insert default weights if they don't already exist
                    -- Manually check existence because ON CONFLICT doesn't work well with partial unique indexes
                    IF NOT EXISTS (
                        SELECT 1 FROM stud_score_weights
                        WHERE preset_id = preset_record.id
                        AND position = roster_position
                        AND attribute_name = attr
                        AND archetype IS NULL
                    ) THEN
                        INSERT INTO stud_score_weights (preset_id, position, attribute_name, weight, archetype)
                        VALUES (preset_record.id, roster_position, attr, weight_val, NULL);
                    END IF;
                END LOOP;
            END IF;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Successfully populated missing position-specific weights for all presets';
END $$;
