const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const studScoreController = require('../controllers/studScoreController');
const db = require('../config/database');

// Get weight presets
router.get('/presets', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM weight_presets WHERE user_id = $1 ORDER BY is_default DESC, preset_name',
      [req.user.id]
    );
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
