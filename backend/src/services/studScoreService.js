const db = require('../config/database');
const { PLAYER_RATINGS } = require('../constants/playerAttributes');
const { calculatePotentialScore } = require('../constants/statCaps');

// Position group mapping - maps specific roster positions to generic position groups
const POSITION_GROUP_MAP = {
  QB: 'QB',
  HB: 'RB',
  FB: 'RB',
  WR: 'WR',
  TE: 'TE',
  LT: 'OL',
  LG: 'OL',
  C: 'OL',
  RG: 'OL',
  RT: 'OL',
  LEDG: 'DL',
  REDG: 'DL',
  DT: 'DL',
  SAM: 'LB',
  MIKE: 'LB',
  WILL: 'LB',
  CB: 'DB',
  FS: 'DB',
  SS: 'DB',
  K: 'K',
  P: 'P'
};

/**
 * Get the position group for a specific roster position
 * @param {string} position - Roster position (e.g., 'HB', 'LT', 'CB')
 * @returns {string} Position group (e.g., 'RB', 'OL', 'DB')
 */
function getPositionGroup(position) {
  return POSITION_GROUP_MAP[position] || position;
}

// Default attribute weights by position (using CFB26 attribute abbreviations)
const DEFAULT_WEIGHTS = {
  QB: {
    THP: 1.5,    // Throw Power
    SAC: 2.0,    // Short Accuracy
    MAC: 2.0,    // Medium Accuracy
    DAC: 1.8,    // Deep Accuracy
    TUP: 1.3,    // Throw Under Pressure
    AWR: 1.5,    // Awareness
    SPD: 0.8,    // Speed
    AGI: 0.7     // Agility
  },
  RB: {
    SPD: 1.8,    // Speed
    ACC: 1.5,    // Acceleration
    AGI: 1.4,    // Agility
    CAR: 1.3,    // Carrying
    BTK: 1.5,    // Break Tackle
    CTH: 0.9,    // Catching
    AWR: 1.0     // Awareness
  },
  WR: {
    SPD: 1.7,    // Speed
    ACC: 1.3,    // Acceleration
    CTH: 1.8,    // Catching
    SPC: 1.2,    // Spectacular Catch
    SRR: 1.5,    // Short Route Running
    MRR: 1.5,    // Medium Route Running
    DRR: 1.5,    // Deep Route Running
    RLS: 1.3,    // Release
    CIT: 1.4,    // Catch in Traffic
    AWR: 1.0     // Awareness
  },
  TE: {
    CTH: 1.6,    // Catching
    SRR: 1.2,    // Short Route Running
    RBK: 1.4,    // Run Block
    SPD: 1.0,    // Speed
    STR: 1.3,    // Strength
    AWR: 1.1     // Awareness
  },
  OL: {
    STR: 1.8,    // Strength
    PBK: 1.7,    // Pass Block
    RBK: 1.7,    // Run Block
    AWR: 1.5,    // Awareness
    AGI: 0.8     // Agility
  },
  DL: {
    PMV: 1.6,    // Power Moves
    FMV: 1.6,    // Finesse Moves
    BSH: 1.7,    // Block Shedding
    STR: 1.5,    // Strength
    PUR: 1.3,    // Pursuit
    TAK: 1.4,    // Tackle
    AWR: 1.2     // Awareness
  },
  LB: {
    TAK: 1.7,    // Tackle
    PUR: 1.5,    // Pursuit
    PRC: 1.6,    // Play Recognition
    MCV: 1.3,    // Man Coverage
    ZCV: 1.3,    // Zone Coverage
    BSH: 1.4,    // Block Shedding
    SPD: 1.2,    // Speed
    AWR: 1.5     // Awareness
  },
  DB: {
    MCV: 1.8,    // Man Coverage
    ZCV: 1.8,    // Zone Coverage
    SPD: 1.7,    // Speed
    ACC: 1.5,    // Acceleration
    AGI: 1.4,    // Agility
    CTH: 1.2,    // Catching
    PRC: 1.5,    // Play Recognition
    AWR: 1.4     // Awareness
  },
  K: {
    KPW: 2.0,    // Kick Power
    KAC: 2.0,    // Kick Accuracy
    AWR: 1.0     // Awareness
  },
  P: {
    KPW: 1.8,    // Kick Power
    KAC: 1.8,    // Kick Accuracy
    AWR: 1.0     // Awareness
  }
};

/**
 * Calculate Stud Score for a player based on weights
 * @param {number} userId - User ID for custom weights
 * @param {object} player - Player object with attributes
 * @param {number} dynastyId - Dynasty ID to get selected preset
 * @returns {object} Object containing base stud score and final adjusted score
 */
async function calculateStudScore(userId, player, dynastyId = null) {
  try {
    let weights;
    let preset;
    let presetId = null;

    // If dynastyId is provided, get the selected preset for the dynasty
    if (dynastyId) {
      const dynastyResult = await db.query(
        'SELECT selected_preset_id FROM dynasties WHERE id = $1',
        [dynastyId]
      );
      if (dynastyResult.rows.length > 0 && dynastyResult.rows[0].selected_preset_id) {
        presetId = dynastyResult.rows[0].selected_preset_id;
      }
    }

    if (presetId) {
      // Get preset info for dev trait and potential weights
      const presetResult = await db.query(
        'SELECT * FROM weight_presets WHERE id = $1',
        [presetId]
      );
      preset = presetResult.rows[0];

      // Get weights from specific preset, prioritizing archetype-specific weights
      const result = await db.query(
        `SELECT attribute_name, weight, archetype 
         FROM stud_score_weights 
         WHERE preset_id = $1 AND position = $2 
         ORDER BY archetype DESC NULLS LAST`,
        [presetId, player.position]
      );
      
      weights = {};
      result.rows.forEach(row => {
        // Priority: archetype-specific weights override position defaults
        // 1. If row is for this specific archetype, always use it
        // 2. If row is a position default (archetype=null) and we don't have this attribute yet, use it
        if (row.archetype === player.archetype) {
          // Exact archetype match - highest priority
          weights[row.attribute_name] = parseFloat(row.weight);
        } else if (row.archetype === null && !weights[row.attribute_name]) {
          // Position default - only use if we don't already have an archetype-specific weight
          weights[row.attribute_name] = parseFloat(row.weight);
        }
      });
    } else {
      // Get user's default preset weights
      const presetResult = await db.query(
        `SELECT wp.*, ssw.attribute_name, ssw.weight, ssw.archetype
         FROM weight_presets wp
         LEFT JOIN stud_score_weights ssw ON wp.id = ssw.preset_id AND ssw.position = $2
         WHERE wp.user_id = $1 AND wp.is_default = TRUE
         ORDER BY ssw.archetype DESC NULLS LAST`,
        [userId, player.position]
      );
      
      if (presetResult.rows.length > 0) {
        preset = {
          dev_trait_weight: presetResult.rows[0].dev_trait_weight,
          potential_weight: presetResult.rows[0].potential_weight
        };
        weights = {};
        presetResult.rows.forEach(row => {
          if (row.attribute_name) {
            // Priority: archetype-specific weights override position defaults
            // 1. If row is for this specific archetype, always use it
            // 2. If row is a position default (archetype=null) and we don't have this attribute yet, use it
            if (row.archetype === player.archetype) {
              // Exact archetype match - highest priority
              weights[row.attribute_name] = parseFloat(row.weight);
            } else if (row.archetype === null && !weights[row.attribute_name]) {
              // Position default - only use if we don't already have an archetype-specific weight
              weights[row.attribute_name] = parseFloat(row.weight);
            }
          }
        });
      } else {
        // Use default weights - map position to position group
        const positionGroup = getPositionGroup(player.position);
        weights = DEFAULT_WEIGHTS[positionGroup] || {};
        preset = {
          dev_trait_weight: 0.15,
          potential_weight: 0.15
        };
      }
    }

    if (Object.keys(weights).length === 0) {
      // Fallback to overall rating if no weights defined
      return {
        baseScore: player.overall_rating || 0,
        studScore: player.overall_rating || 0
      };
    }

    // Calculate weighted score
    let totalWeightedValue = 0;
    let totalWeight = 0;

    const attributes = player.attributes || {};

    for (const [attr, weight] of Object.entries(weights)) {
      const value = attributes[attr];
      if (value !== undefined && value !== null) {
        totalWeightedValue += value * weight;
        totalWeight += weight;
      }
    }

    // Calculate base score (normalized to 0-100 scale)
    const baseScore = totalWeight > 0 ? Math.round((totalWeightedValue / totalWeight) * 10) / 10 : 0;

    // Calculate adjusted score with dev trait and potential
    const devTraitWeight = preset.dev_trait_weight || 0.15;
    const potentialWeight = preset.potential_weight || 0.15;
    
    // Dev trait bonus: Elite=15, Star=10, Impact=5, Normal=0
    const devTraitBonus = getDevTraitBonus(player.dev_trait);
    
    // Calculate potential score (0-100 based on stat caps)
    const potentialScore = player.stat_caps 
      ? calculatePotentialScore(player.stat_caps, player.position, player.archetype)
      : 100;

    // Final STUD score formula:
    // Base attributes weight + Dev trait impact + Potential impact
    const attributeWeight = 1 - devTraitWeight - potentialWeight;
    const studScore = (baseScore * attributeWeight) + 
                      (devTraitBonus * devTraitWeight) + 
                      (potentialScore * potentialWeight);

    return {
      baseScore: Math.round(baseScore * 10) / 10,
      studScore: Math.round(studScore * 10) / 10,
      devTraitBonus,
      potentialScore
    };

  } catch (error) {
    console.error('Calculate stud score error:', error);
    return {
      baseScore: player.overall_rating || 0,
      studScore: player.overall_rating || 0
    };
  }
}

/**
 * Get dev trait bonus value
 * @param {string} devTrait - Development trait (Elite, Star, Impact, Normal)
 * @returns {number} Bonus value (0-100 scale)
 */
function getDevTraitBonus(devTrait) {
  const bonuses = {
    'Elite': 100,
    'Star': 85,
    'Impact': 70,
    'Normal': 55
  };
  return bonuses[devTrait] || 55;
}

/**
 * Get or create default weight preset for user
 */
async function getOrCreateDefaultPreset(userId) {
  try {
    // Check if user has a default preset
    let result = await db.query(
      'SELECT * FROM weight_presets WHERE user_id = $1 AND is_default = TRUE',
      [userId]
    );

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    // Create default preset
    result = await db.query(
      `INSERT INTO weight_presets (user_id, preset_name, description, is_default)
       VALUES ($1, 'Default', 'Default weighting scheme', TRUE)
       RETURNING *`,
      [userId]
    );

    const preset = result.rows[0];

    // Insert default weights for all specific roster positions
    // Map each roster position to its group and insert the group's weights
    for (const [rosterPosition, positionGroup] of Object.entries(POSITION_GROUP_MAP)) {
      const weights = DEFAULT_WEIGHTS[positionGroup];
      if (weights) {
        for (const [attr, weight] of Object.entries(weights)) {
          await db.query(
            `INSERT INTO stud_score_weights (preset_id, position, attribute_name, weight)
             VALUES ($1, $2, $3, $4)`,
            [preset.id, rosterPosition, attr, weight]
          );
        }
      }
    }

    return preset;
  } catch (error) {
    console.error('Get or create default preset error:', error);
    throw error;
  }
}

module.exports = {
  calculateStudScore,
  getOrCreateDefaultPreset,
  calculatePotentialScore,
  getDevTraitBonus,
  DEFAULT_WEIGHTS,
  getPositionGroup
};
