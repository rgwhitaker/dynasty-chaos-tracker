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
    const { preset_name, description } = req.body;
    const result = await db.query(
      'INSERT INTO weight_presets (user_id, preset_name, description) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, preset_name, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create preset' });
  }
});

// Get weights
router.get('/weights', authMiddleware, studScoreController.getWeights);

// Update weight
router.put('/weights', authMiddleware, studScoreController.updateWeight);

// Reset weights
router.post('/weights/reset', authMiddleware, studScoreController.resetWeights);

module.exports = router;
