const db = require('../config/database');
const { DEFAULT_WEIGHTS, getPositionGroup } = require('../services/studScoreService');
const { POSITION_ARCHETYPES } = require('../constants/playerAttributes');

/**
 * Get weights for a specific preset, position, and optionally archetype
 */
const getWeights = async (req, res) => {
  try {
    const { presetId, position, archetype } = req.query;

    if (!presetId) {
      return res.status(400).json({ error: 'presetId is required' });
    }

    // Verify preset belongs to user
    const presetCheck = await db.query(
      'SELECT * FROM weight_presets WHERE id = $1 AND user_id = $2',
      [presetId, req.user.id]
    );

    if (presetCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Preset not found' });
    }

    let query = 'SELECT * FROM stud_score_weights WHERE preset_id = $1';
    const params = [presetId];

    if (position) {
      query += ' AND position = $2';
      params.push(position);
      
      if (archetype) {
        // When archetype is specified, get both position defaults and archetype overrides
        // Archetype overrides will take precedence in the frontend
        query += ' AND (archetype IS NULL OR archetype = $3)';
        params.push(archetype);
      } else {
        query += ' AND archetype IS NULL';
      }
    }

    // Order by archetype NULLS LAST to group position defaults before archetype overrides
    // The frontend will separate and merge them appropriately
    query += ' ORDER BY position, archetype NULLS LAST, attribute_name';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get weights error:', error);
    res.status(500).json({ error: 'Failed to fetch weights' });
  }
};

/**
 * Get default weights for a position/archetype (from DEFAULT_WEIGHTS constant)
 */
const getDefaultWeights = async (req, res) => {
  try {
    const { position } = req.query;

    if (!position) {
      return res.json(DEFAULT_WEIGHTS);
    }

    // Map specific position to position group
    const positionGroup = getPositionGroup(position);
    const weights = DEFAULT_WEIGHTS[positionGroup];

    if (!weights) {
      return res.status(404).json({ error: 'Position not found' });
    }

    res.json(weights);
  } catch (error) {
    console.error('Get default weights error:', error);
    res.status(500).json({ error: 'Failed to fetch default weights' });
  }
};

/**
 * Update a weight for a specific preset, position, and optionally archetype
 */
const updateWeight = async (req, res) => {
  try {
    const { presetId, position, archetype, attributeName, weight } = req.body;

    if (!presetId || !position || !attributeName || weight === undefined) {
      return res.status(400).json({ 
        error: 'presetId, position, attributeName, and weight are required' 
      });
    }

    // Verify preset belongs to user
    const presetCheck = await db.query(
      'SELECT * FROM weight_presets WHERE id = $1 AND user_id = $2',
      [presetId, req.user.id]
    );

    if (presetCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Preset not found' });
    }

    const result = await db.query(
      `INSERT INTO stud_score_weights (preset_id, position, archetype, attribute_name, weight)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (preset_id, position, archetype, attribute_name)
       DO UPDATE SET weight = $5, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [presetId, position, archetype || null, attributeName, weight]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update weight error:', error);
    res.status(500).json({ error: 'Failed to update weight' });
  }
};

/**
 * Batch update weights for a position/archetype
 */
const batchUpdateWeights = async (req, res) => {
  try {
    const { presetId, position, archetype, weights } = req.body;

    if (!presetId || !position || !weights) {
      return res.status(400).json({ 
        error: 'presetId, position, and weights are required' 
      });
    }

    // Verify preset belongs to user
    const presetCheck = await db.query(
      'SELECT * FROM weight_presets WHERE id = $1 AND user_id = $2',
      [presetId, req.user.id]
    );

    if (presetCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Preset not found' });
    }

    // Use a transaction for atomicity and better performance
    await db.query('BEGIN');

    try {
      // Delete existing weights for this position/archetype
      await db.query(
        'DELETE FROM stud_score_weights WHERE preset_id = $1 AND position = $2 AND archetype IS NOT DISTINCT FROM $3',
        [presetId, position, archetype || null]
      );

      // Build multi-row insert statement
      const weightEntries = Object.entries(weights);
      if (weightEntries.length > 0) {
        const values = [];
        const params = [];
        let paramIndex = 1;

        weightEntries.forEach(([attr, weight]) => {
          values.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4})`);
          params.push(presetId, position, archetype || null, attr, weight);
          paramIndex += 5;
        });

        await db.query(
          `INSERT INTO stud_score_weights (preset_id, position, archetype, attribute_name, weight) 
           VALUES ${values.join(', ')}`,
          params
        );
      }

      await db.query('COMMIT');
      res.json({ message: 'Weights updated successfully' });
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
  } catch (error) {
    console.error('Batch update weights error:', error);
    res.status(500).json({ error: 'Failed to batch update weights' });
  }
};

/**
 * Reset weights to defaults for a position/archetype
 */
const resetWeights = async (req, res) => {
  try {
    const { presetId, position, archetype } = req.body;

    if (!presetId || !position) {
      return res.status(400).json({ error: 'presetId and position are required' });
    }

    // Verify preset belongs to user
    const presetCheck = await db.query(
      'SELECT * FROM weight_presets WHERE id = $1 AND user_id = $2',
      [presetId, req.user.id]
    );

    if (presetCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Preset not found' });
    }

    await db.query(
      'DELETE FROM stud_score_weights WHERE preset_id = $1 AND position = $2 AND archetype IS NOT DISTINCT FROM $3',
      [presetId, position, archetype || null]
    );

    res.json({ message: 'Weights reset to defaults' });
  } catch (error) {
    console.error('Reset weights error:', error);
    res.status(500).json({ error: 'Failed to reset weights' });
  }
};

/**
 * Update preset dev trait and potential weights
 */
const updatePresetWeights = async (req, res) => {
  try {
    const { presetId } = req.params;
    const { devTraitWeight, potentialWeight } = req.body;

    if (!presetId) {
      return res.status(400).json({ error: 'presetId is required' });
    }

    // Verify preset belongs to user
    const presetCheck = await db.query(
      'SELECT * FROM weight_presets WHERE id = $1 AND user_id = $2',
      [presetId, req.user.id]
    );

    if (presetCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Preset not found' });
    }

    const updates = [];
    const params = [presetId];
    let paramCount = 2;

    if (devTraitWeight !== undefined) {
      updates.push(`dev_trait_weight = $${paramCount}`);
      params.push(devTraitWeight);
      paramCount++;
    }

    if (potentialWeight !== undefined) {
      updates.push(`potential_weight = $${paramCount}`);
      params.push(potentialWeight);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');

    const result = await db.query(
      `UPDATE weight_presets SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
      params
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update preset weights error:', error);
    res.status(500).json({ error: 'Failed to update preset weights' });
  }
};

/**
 * Get archetypes for a position
 */
const getArchetypes = async (req, res) => {
  try {
    const { position } = req.query;

    if (!position) {
      return res.json(POSITION_ARCHETYPES);
    }

    const archetypes = POSITION_ARCHETYPES[position];
    if (!archetypes) {
      return res.status(404).json({ error: 'Position not found' });
    }

    res.json(archetypes);
  } catch (error) {
    console.error('Get archetypes error:', error);
    res.status(500).json({ error: 'Failed to fetch archetypes' });
  }
};

module.exports = {
  getWeights,
  getDefaultWeights,
  updateWeight,
  batchUpdateWeights,
  resetWeights,
  updatePresetWeights,
  getArchetypes,
};
