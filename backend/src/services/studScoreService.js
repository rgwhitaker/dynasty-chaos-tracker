const db = require('../config/database');
const studScoreService = require('./studScoreService');

// Default attribute weights by position
const DEFAULT_WEIGHTS = {
  QB: {
    throw_power: 1.5,
    throw_accuracy_short: 2.0,
    throw_accuracy_mid: 2.0,
    throw_accuracy_deep: 1.8,
    throw_on_run: 1.3,
    awareness: 1.5,
    speed: 0.8,
    agility: 0.7
  },
  RB: {
    speed: 1.8,
    acceleration: 1.5,
    agility: 1.4,
    carrying: 1.3,
    break_tackle: 1.5,
    catching: 0.9,
    awareness: 1.0
  },
  WR: {
    speed: 1.7,
    acceleration: 1.3,
    catching: 1.8,
    spectacular_catch: 1.2,
    route_running: 1.5,
    release: 1.3,
    catching_in_traffic: 1.4,
    awareness: 1.0
  },
  TE: {
    catching: 1.6,
    route_running: 1.2,
    blocking: 1.4,
    speed: 1.0,
    strength: 1.3,
    awareness: 1.1
  },
  OL: {
    strength: 1.8,
    pass_blocking: 1.7,
    run_blocking: 1.7,
    awareness: 1.5,
    agility: 0.8
  },
  DL: {
    power_moves: 1.6,
    finesse_moves: 1.6,
    block_shedding: 1.7,
    strength: 1.5,
    pursuit: 1.3,
    tackle: 1.4,
    awareness: 1.2
  },
  LB: {
    tackle: 1.7,
    pursuit: 1.5,
    play_recognition: 1.6,
    coverage: 1.3,
    block_shedding: 1.4,
    speed: 1.2,
    awareness: 1.5
  },
  DB: {
    man_coverage: 1.8,
    zone_coverage: 1.8,
    speed: 1.7,
    acceleration: 1.5,
    agility: 1.4,
    catching: 1.2,
    play_recognition: 1.5,
    awareness: 1.4
  },
  K: {
    kick_power: 2.0,
    kick_accuracy: 2.0,
    awareness: 1.0
  },
  P: {
    kick_power: 1.8,
    kick_accuracy: 1.8,
    awareness: 1.0
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
