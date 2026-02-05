const db = require('../config/database');
const { PLAYER_RATINGS } = require('../constants/playerAttributes');

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
 * @param {number} presetId - Optional preset ID for specific weight scheme
 * @returns {number} Calculated stud score
 */
async function calculateStudScore(userId, player, presetId = null) {
  try {
    let weights;

    if (presetId) {
      // Get weights from specific preset
      const result = await db.query(
        'SELECT attribute_name, weight FROM stud_score_weights WHERE preset_id = $1 AND position = $2',
        [presetId, player.position]
      );
      weights = {};
      result.rows.forEach(row => {
        weights[row.attribute_name] = parseFloat(row.weight);
      });
    } else {
      // Get user's default preset weights
      const presetResult = await db.query(
        `SELECT ssw.attribute_name, ssw.weight 
         FROM stud_score_weights ssw
         JOIN weight_presets wp ON ssw.preset_id = wp.id
         WHERE wp.user_id = $1 AND wp.is_default = TRUE AND ssw.position = $2`,
        [userId, player.position]
      );
      
      if (presetResult.rows.length > 0) {
        weights = {};
        presetResult.rows.forEach(row => {
          weights[row.attribute_name] = parseFloat(row.weight);
        });
      } else {
        // Use default weights
        weights = DEFAULT_WEIGHTS[player.position] || {};
      }
    }

    if (Object.keys(weights).length === 0) {
      // Fallback to overall rating if no weights defined
      return player.overall_rating || 0;
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

    // Return normalized score (0-100 scale)
    return totalWeight > 0 ? Math.round((totalWeightedValue / totalWeight) * 10) / 10 : 0;

  } catch (error) {
    console.error('Calculate stud score error:', error);
    return player.overall_rating || 0; // Fallback to overall rating
  }
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

    // Insert default weights for all positions
    for (const [position, weights] of Object.entries(DEFAULT_WEIGHTS)) {
      for (const [attr, weight] of Object.entries(weights)) {
        await db.query(
          `INSERT INTO stud_score_weights (preset_id, position, attribute_name, weight)
           VALUES ($1, $2, $3, $4)`,
          [preset.id, position, attr, weight]
        );
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
  DEFAULT_WEIGHTS
};
