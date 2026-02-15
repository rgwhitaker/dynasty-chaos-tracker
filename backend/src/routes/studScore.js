const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const studScoreController = require('../controllers/studScoreController');
const db = require('../config/database');
const { getOrCreateDefaultPreset } = require('../services/studScoreService');

// Get weight presets
router.get('/presets', authMiddleware, async (req, res) => {
  try {
    let result = await db.query(
      'SELECT * FROM weight_presets WHERE user_id = $1 ORDER BY is_default DESC, preset_name',
      [req.user.id]
    );

    // Auto-create default preset if user has none
    if (result.rows.length === 0) {
      await getOrCreateDefaultPreset(req.user.id);
      result = await db.query(
        'SELECT * FROM weight_presets WHERE user_id = $1 ORDER BY is_default DESC, preset_name',
        [req.user.id]
      );
    }

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch presets' });
  }
});

// Create weight preset
router.post('/presets', authMiddleware, async (req, res) => {
  try {
    const { preset_name, description, dev_trait_weight, potential_weight } = req.body;
    const result = await db.query(
      `INSERT INTO weight_presets 
       (user_id, preset_name, description, dev_trait_weight, potential_weight) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [
        req.user.id, 
        preset_name, 
        description, 
        dev_trait_weight || 0.15, 
        potential_weight || 0.15
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create preset' });
  }
});

// Delete weight preset
router.delete('/presets/:presetId', authMiddleware, async (req, res) => {
  try {
    const { presetId } = req.params;

    // Verify preset belongs to user
    const presetCheck = await db.query(
      'SELECT * FROM weight_presets WHERE id = $1 AND user_id = $2',
      [presetId, req.user.id]
    );

    if (presetCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Preset not found' });
    }

    // Prevent deleting the last preset
    const countResult = await db.query(
      'SELECT COUNT(*) FROM weight_presets WHERE user_id = $1',
      [req.user.id]
    );

    if (parseInt(countResult.rows[0].count) <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last preset. You must have at least one preset.' });
    }

    const wasDefault = presetCheck.rows[0].is_default;

    // Delete preset (cascade will remove associated weights)
    await db.query('DELETE FROM weight_presets WHERE id = $1', [presetId]);

    // If deleted preset was default, make another one default
    if (wasDefault) {
      await db.query(
        `UPDATE weight_presets SET is_default = TRUE, updated_at = CURRENT_TIMESTAMP
         WHERE id = (SELECT id FROM weight_presets WHERE user_id = $1 ORDER BY created_at LIMIT 1)`,
        [req.user.id]
      );
    }

    res.json({ message: 'Preset deleted successfully' });
  } catch (error) {
    console.error('Delete preset error:', error);
    res.status(500).json({ error: 'Failed to delete preset' });
  }
});

// Update preset (dev trait and potential weights)
router.put('/presets/:presetId', authMiddleware, studScoreController.updatePresetWeights);

// Get weights for a preset/position/archetype
router.get('/weights', authMiddleware, studScoreController.getWeights);

// Get default weights
router.get('/weights/defaults', authMiddleware, studScoreController.getDefaultWeights);

// Update single weight
router.put('/weights', authMiddleware, studScoreController.updateWeight);

// Batch update weights
router.post('/weights/batch', authMiddleware, studScoreController.batchUpdateWeights);

// Reset weights
router.post('/weights/reset', authMiddleware, studScoreController.resetWeights);

// Get archetypes
router.get('/archetypes', authMiddleware, studScoreController.getArchetypes);

module.exports = router;
